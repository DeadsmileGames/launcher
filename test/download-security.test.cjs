const test = require('node:test');
const assert = require('node:assert/strict');
const {publicAddress,downloadResponse}=require('../electron/download-security.cjs');
test('download destinations exclude private, loopback, link-local and mapped addresses',()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','0.0.0.0','224.0.0.1','::1','::ffff:127.0.0.1','fe80::1','fd00::1','2001:db8::1']) assert.equal(publicAddress(ip),false,ip);
 for(const ip of ['1.1.1.1','8.8.8.8','2606:4700:4700::1111']) assert.equal(publicAddress(ip),true,ip);
});
test('untrusted URLs and DNS responses are rejected before a download request',async()=>{
 for(const url of ['http://example.test/a.zip','https://user:pass@example.test/a.zip','https://127.0.0.1/a.zip','https://example.test:8443/a.zip']) await assert.rejects(downloadResponse(url,{lookup:async()=>[{address:'127.0.0.1',family:4}]}),/DOWNLOAD_NOT_AUTHORIZED/);
 await assert.rejects(downloadResponse('https://example.test/a.zip',{lookup:async()=>[{address:'8.8.8.8',family:4},{address:'10.0.0.1',family:4}]}),/DOWNLOAD_NOT_AUTHORIZED/);
});
