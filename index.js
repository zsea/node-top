var crypto = require('crypto'), moment = require('moment'), fetch = require('node-fetch'), qs = require('querystring'), FormData = require('form-data');
var _emitter = require('events').EventEmitter, tmc = require('./tmc/tmcClient').TmcClient;
global.debug = global.debug || function () { }
function sleep(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    })
}
/**处理Promise对象 */
async function syncHandler(options) {
    for (let key in options) {
        let v = options[key];
        if (v && v.constructor == Promise) {
            v = await v;
            options[key] = v;
        }
        else if (typeof v == 'function') {
            v = await v();
            options[key] = v;
        }

    }
    return options;
}
function sign(appSecret, options, body) {
    var keys = [], mode = 'urlencoded';
    for (var key in options) {
        keys.push(key);
    }
    keys = keys.sort();
    var s = ''
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var v = options[key];
        if (key == 'sign' || v === null || v === undefined) {
            continue;
        }
        if (typeof v === 'object' && v.attachment) {
            mode = 'formdata';
            continue;
        }
        else if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') {
            mode = 'formdata';
            continue;
        }
        debug('sign arg:', key)
        s += key + v;
    }
    s = appSecret + s + (body || '') + appSecret;
    var md5 = crypto.createHash('md5');
    md5.update(s, 'utf8');
    var sign = md5.digest('hex');
    sign = sign.toUpperCase();
    return {
        sign: sign,
        mode: mode
    };
}
function TopSdk(appKey, appSecret, settings) {
    settings = settings || {};
    var emitter = new _emitter();
    var self = this;
    //var rest_url = settings.rest_url || 'http://gw.api.taobao.com/router/rest';
    //var batch_url = settings.batch_url || 'http://gw.api.taobao.com/router/batch';
    this.Execute = async function (method, options, _settings) {
        var set = Object.assign({}, settings, _settings);
        var times = set.retry_times || 5;
        var times = 0, retry_times = set.retry_times || 5;
        var response;
        while (times < retry_times) {
            times++;
            let _options = Object.assign({}, options);
            _options = await syncHandler(_options);
            _options['method'] = method;
            _options['app_key'] = appKey;
            _options['timestamp'] = moment().format('YYYY-MM-DD HH:mm:ss');
            _options['format'] = 'json';
            _options['v'] = '2.0';
            _options['sign_method'] = 'md5';
            var _sign = sign(appSecret, _options);
            debug(_sign);
            _options['sign'] = _sign.sign;
            var request_options = {}
            if (_sign.mode == 'formdata') {
                var form = new FormData();
                for (var key in _options) {
                    let v = _options[key];

                    if (v === null || v === undefined) {
                        continue;
                    }
                    if (v !== null && v != undefined && typeof v === 'object' && v.attachment) {
                        form.append(key, v.value, v.options)
                    }
                    else {
                        form.append(key, v)
                    }
                }

                request_options = {
                    method: 'POST',
                    headers: {
                        'content-length': await new Promise(function (resolve, reject) {
                            form.getLength(function (err, len) {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    resolve(len)
                                }
                            })
                        })
                    },
                    timeout: settings.timeout || 30000,
                    body: form
                }
            }
            else {
                for (var key in _options) {
                    let v = _options[key];
                    if (v !== null && typeof v === 'object') {
                        _options[key] = v.value
                    }

                }
                request_options = {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    timeout: settings.timeout || 30000,
                    body: qs.stringify(_options)
                }
            }
            try {
                debug('headers', request_options.headers)
                response = await fetch(set.rest_url || process.env["TOP_REST_URL"] || 'http://gw.api.taobao.com/router/rest', request_options).then(function (res) {
                    //console.log(res)
                    if (res.ok) {
                        return res.json();
                    }
                    else {
                        throw Error('远程服务器返回状态错误：' + res.status);
                    }
                }).catch(function (e) {
                    //console.log(e);
                    debug(e);
                    throw e;
                })
            }
            catch (e) {
                debug('调用top接口错误：', e);
                await sleep(Math.pow(times, 2) * 1000);
                continue
            }
            emitter.emit('completed', _options, response)
            //console.log(response);
            if (!response) {
                await sleep(Math.pow(times, 2) * 1000);
                continue
            };
            var retry_code = set.retry_code || []
            if (response && response.error_response && response.error_response.sub_code) {
                if ((response.error_response.sub_code.indexOf('isp.') > -1 && response.error_response.sub_code.indexOf('isp.invalid-parameters') == -1)) {
                    await sleep(Math.pow(times, 2) * 1000);
                    continue;
                }
                if ((response.error_response.sub_code == 'accesscontrol.limited-by-api-access-count'
                    || response.error_response.sub_code == 'accesscontrol.limited-by-dynamic-access-count'
                    || retry_code.indexOf(response.error_response.sub_code) != -1)) {
                    await sleep(Math.pow(times, 2) * 1000);
                    continue;
                }
            }
            break;
        }
        return response;
    }
    this.on = function (event, listener) {
        emitter.on(event, listener)
        return self;
    }
    this.Listen = function (group_name, url, handler) {
        if (typeof group_name == 'function') {
            handler = group_name;
            url == 'ws://mc.api.taobao.com/';
            group_name = 'default';

        }
        if (typeof url == 'function') {
            handler = url;
            url = 'ws://mc.api.taobao.com/'
        }
        group_name = group_name || 'default';
        url = url || process.env["TOP_TMC_URL"] || 'ws://mc.api.taobao.com/';
        var tmcClient = new tmc(appKey, appSecret, group_name);
        tmcClient.connect(url, async function (message, cb) {
            var err;
            try {
                await handler(message)
            }
            catch (e) {
                err = e;
            }
            finally {
                cb(err);
            }
        })
    }
}

module.exports = TopSdk;