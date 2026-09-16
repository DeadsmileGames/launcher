class DownloadQueue {
    constructor({ worker, broadcast, maxConcurrent = 2 }) {
        this.worker = worker;
        this.broadcast = broadcast;
        this.maxConcurrent = Math.max(1, Math.min(5, maxConcurrent));
        this.jobs = new Map();
        this.order = [];
        this.active = 0;
    }

    setMaxConcurrent(n) {
        this.maxConcurrent = Math.max(1, Math.min(5, Number(n) || 1));
        this._pump();
        this._emit();
    }

    enqueue({ id, slug, title, url, apiKey = "", itchGameId = null, preferredItchChannel = null, commerceEnabled = false, mode = "download", currentVersion = null, filename = "", path: installedPath = null }) {
        if (this.jobs.has(id)) return this.jobs.get(id).promise;

        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });

        const job = {
            id,
            slug,
            title,
            url,
            apiKey,
            itchGameId,
            commerceEnabled,
            preferredItchChannel,
            mode,
            currentVersion,
            filename,
            installedPath,
            status: "queued",
            percent: 0,
            bytesReceived: 0,
            totalBytes: 0,
            fileName: "",
            error: null,
            paused: false,
            aborted: false,
            _workerActive: false,
            promise,
            _resolve: resolve,
            _reject: reject,
        };

        this.jobs.set(id, job);
        this.order.push(id);
        this._emit();
        this._pump();
        return promise;
    }

    pause(id) {
        const job = this.jobs.get(id);
        if (!job) return false;
        if (job.status === "complete" || job.status === "failed") return false;
        job.paused = true;
        if (job.status === "queued") {
            job.status = "paused";
            this._emit();
        }
        return true;
    }

    resume(id) {
        const job = this.jobs.get(id);
        if (!job || !job.paused) return false;




        if (job.status !== "paused") {
            job.paused = false;
            this._emit();
            return true;
        }

        job.paused = false;
        job.status = "queued";
        this.order = [id, ...this.order.filter((x) => x !== id)];
        this._emit();
        this._pump();
        return true;
    }

    cancel(id) {
        const job = this.jobs.get(id);
        if (!job) return false;
        job.aborted = true;
        job.paused = false;
        if (job._workerActive) {
            job.status = "cancelling";
        } else {
            if (this.jobs.get(id) === job) this.jobs.delete(id);
            this.order = this.order.filter((x) => x !== id);
            job._reject?.(new Error("Cancelled"));
        }
        this._emit();
        this._pump();
        return true;
    }

    reorder(ids) {
        if (!Array.isArray(ids)) return false;
        const valid = [...new Set(ids.filter((id) => this.jobs.has(id)))];
        const rest = this.order.filter((id) => !valid.includes(id));
        this.order = [...valid, ...rest];
        this._emit();
        this._pump();
        return true;
    }

    snapshot() {
        return this.order
            .map((id) => this.jobs.get(id))
            .filter(Boolean)
            .map((j, i) => ({
                id: j.id,
                slug: j.slug,
                title: j.title,
                mode: j.mode,
                status: j.status,
                percent: j.percent,
                bytesReceived: j.bytesReceived,
                totalBytes: j.totalBytes,
                fileName: j.fileName,
                error: j.error,
                queuePosition: i,
                speed: j.speed || 0,
                eta: j.eta ?? null,
            }));
    }

    _pump() {
        while (this.active < this.maxConcurrent) {
            const nextId = this.order.find((id) => {
                const j = this.jobs.get(id);
                return j && j.status === "queued" && !j.paused && !j.aborted;
            });
            if (!nextId) break;
            this._start(nextId);
        }
    }

    async _start(id) {
        const job = this.jobs.get(id);
        if (!job) return;

        job.status = "downloading";
        job.error = null;
        job._workerActive = true;
        this.active += 1;
        this._emit();

        let result = null;
        let err = null;
        let lastTick = Date.now();
        let lastBytes = 0;
        job.speed = 0;
        job.eta = null;

        const tickSpeed = () => {
            const now = Date.now();
            const dt = (now - lastTick) / 1000;
            if (dt < 0.5) return;
            const db = job.bytesReceived - lastBytes;
            job.speed = db > 0 ? db / dt : 0;
            job.eta =
                job.speed > 0 && job.totalBytes > 0
                    ? (job.totalBytes - job.bytesReceived) / job.speed
                    : null;
            lastTick = now;
            lastBytes = job.bytesReceived;
        };
        try {
            result = await this.worker(job, {
                isPaused: () => job.paused,
                isAborted: () => job.aborted,
                onProgress: (p) => {
                    if (p.status) job.status = p.status;
                    if (typeof p.percent === "number") job.percent = p.percent;
                    if (typeof p.received === "number")
                        job.bytesReceived = p.received;
                    if (typeof p.total === "number") job.totalBytes = p.total;
                    if (p.fileName) job.fileName = p.fileName;
                    tickSpeed();
                    this._emit();
                },
            });
        } catch (e) {
            err = e;
        } finally {
            job.apiKey = "";
        }

        job._workerActive = false;
        this.active = Math.max(0, this.active - 1);
        if (err) {
            const msg = err?.message || String(err);

            if (job.aborted || msg === "Cancelled") {
                if (this.jobs.get(id) === job) {
                    this.jobs.delete(id);
                    this.order = this.order.filter((x) => x !== id);
                    job._reject?.(new Error("Cancelled"));
                }
                this._emit();
                this._pump();
                return;
            }

            if (job.paused) {
                job.status = "paused";
                this._emit();
                this._pump();
                return;
            }




            if (msg === "Paused") {
                job.status = "queued";
                this._emit();
                this._pump();
                return;
            }

            job.status = "failed";
            job.error = msg;
            this._emit();
            job._reject?.(err);

            setTimeout(() => {
                this.jobs.delete(id);
                this.order = this.order.filter((x) => x !== id);
                this._emit();
            }, 6000);
            this._pump();
            return;
        }
        if (job.aborted) {
            if (this.jobs.get(id) === job) this.jobs.delete(id);
            this.order = this.order.filter((x) => x !== id);
            job._reject?.(new Error("Cancelled"));
            this._emit();
            this._pump();
            return;
        }

        if (job.paused) {
            job.status = "paused";
            this._emit();
            this._pump();
            return;
        }

        job.status = "complete";
        job.percent = 100;
        job.result = result;
        this._emit();
        job._resolve(result);

        setTimeout(() => {
            if (this.jobs.get(id) !== job) return;
            this.jobs.delete(id);
            this.order = this.order.filter((x) => x !== id);
            this._emit();
            this._pump();
        }, 4000);
    }

    _emit() {
        try {
            this.broadcast("deadsmile:download-queue", this.snapshot());
        } catch {}
    }
}

module.exports = { DownloadQueue };
