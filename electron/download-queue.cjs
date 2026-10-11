class DownloadQueue {
    constructor({ worker, broadcast, formatError = defaultError, maxConcurrent = 2 }) {
        this.worker = worker;
        this.broadcast = broadcast;
        this.formatError = formatError;
        this.maxConcurrent = Math.max(1, Math.min(5, maxConcurrent));
        this.jobs = new Map();
        this.order = [];
        this.active = 0;
    }

    enqueue({ id, slug, title, mode = "download", currentVersion = null }) {
        const previous = this.jobs.get(id);
        if (previous && (previous._workerActive || !['failed', 'complete'].includes(previous.status))) return previous.promise;
        if (previous) {
            this.jobs.delete(id);
            this.order = this.order.filter((itemId) => itemId !== id);
        }

        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });

        const job = {
            id,
            slug,
            title,
            mode,
            currentVersion,
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
                error: j.error ? this.formatError({ code: j.errorCode }) : null,
                errorCode: j.errorCode || null,
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
                    if (!job.aborted && ["downloading", "extracting", "installing", "updating"].includes(p.status)) job.status = p.status;
                    if (Number.isFinite(p.percent)) job.percent = Math.max(0, Math.min(99, p.percent));
                    if (Number.isFinite(p.received))
                        job.bytesReceived = Math.max(0, p.received);
                    if (Number.isFinite(p.total)) job.totalBytes = Math.max(0, p.total);
                    if (p.fileName) job.fileName = p.fileName;
                    tickSpeed();
                    this._emit();
                },
            });
        } catch (e) {
            err = e;
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
            job.errorCode = err?.code || msg.match(/^[A-Z][A-Z_]+$/)?.[0] || 'GAME_DOWNLOAD_FAILED';
            job.error = this.formatError({ code: job.errorCode });
            this._emit();
            job._reject?.(err);

            setTimeout(() => {
                if (this.jobs.get(id) !== job) return;
                this.jobs.delete(id);
                this.order = this.order.filter((x) => x !== id);
                this._emit();
            }, 6000);
            this._pump();
            return;
        }
        job.status = "complete";
        job.percent = 100;
        job.result = result;
        this._emit();
        job._resolve(result);
        this._pump();

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

const catalog = require('./generated/errors.json');
function defaultError(error) { return catalog.en[error.code] || catalog.en.GAME_DOWNLOAD_FAILED; }

module.exports = { DownloadQueue };
