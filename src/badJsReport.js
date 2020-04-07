/**
 * Name:    badJsReport.js
 * Version  1.1.0
 * Author   xuren
 * Released on: Apri 7, 2020
 * reference https://github.com/xianyulaodi/badJsReport  、 https://github.com/ecitlm/js-log-report/blob/master/src/error.js
 */

;(function(){

    // 'use strict';

    if (window.badJsReport){

       return window.badJsReport
    };

    /**
     获取设备是安卓、IOS  还是PC端
     */
    function getDevices () {
        var u = navigator.userAgent, app = navigator.appVersion
        if (/AppleWebKit.*Mobile/i.test(navigator.userAgent) || (/MIDP|SymbianOS|NOKIA|SAMSUNG|LG|NEC|TCL|Alcatel|BIRD|DBTEL|Dopod|PHILIPS|HAIER|LENOVO|MOT-|Nokia|SonyEricsson|SIE-|Amoi|ZTE/.test(navigator.userAgent))) {
            if (window.location.href.indexOf('?mobile') < 0) {
                try {
                    if (/iPhone|mac|iPod|iPad/i.test(navigator.userAgent)) {
                        return 'iPhone'
                    } else {
                        return 'Android'
                    }
                } catch (e) {}
            }
        } else if (u.indexOf('iPad') > -1) {
            return 'iPhone'
        } else {
            return 'Android'
        }
    }

    /**
     获取浏览器类型
     */
    function getBrowser () {
        var userAgent = navigator.userAgent // 取得浏览器的userAgent字符串
        var isOpera = userAgent.indexOf('Opera') > -1
        if (isOpera) {
            return 'Opera'
        }; // 判断是否Opera浏览器
        if (userAgent.indexOf('Firefox') > -1) {
            return 'FF'
        } // 判断是否Firefox浏览器
        if (userAgent.indexOf('Chrome') > -1) {
            return 'Chrome'
        }
        if (userAgent.indexOf('Safari') > -1) {
            return 'Safari'
        } // 判断是否Safari浏览器
        if (userAgent.indexOf('compatible') > -1 && userAgent.indexOf('MSIE') > -1 && !isOpera) {
            return 'IE'
        }; // 判断是否IE浏览器
    }

    function getSystemVersion () {
        var ua = window.navigator.userAgent
        if (ua.indexOf('CPU iPhone OS ') >= 0) {
            return ua.substring(ua.indexOf('CPU iPhone OS ') + 14, ua.indexOf(' like Mac OS X'))
        } else if (ua.indexOf('Android ') >= 0) {
            return ua.substr(ua.indexOf('Android ') + 8, 3)
        } else {
            return 'other'
        }
    }

    /*
    *  默认上报的错误信息
    */
    var defaults = {
        ua: window.navigator.userAgent,
        browser:getBrowser(),
        os: getDevices(),
        osVersion: getSystemVersion(),
        errUrl: window.location.href,
        msg:'',  //错误的具体信息
        url:'',  //错误所在的url
        line:'', //错误所在的行
        col:'',  //错误所在的列
        error:'', //具体的error对象
        logDt:'',
    };

    /*
    *ajax封装
    */
    function ajax(options) {
        options = options || {};
        options.type = (options.type || "GET").toUpperCase();
        options.dataType = options.dataType || "json";
        var params = formatParams(options.data);

        if (window.XMLHttpRequest) {
           var xhr = new XMLHttpRequest();
        } else {
           var xhr = new ActiveXObject('Microsoft.XMLHTTP');
        }

        xhr.onreadystatechange = function () {
           if (xhr.readyState == 4) {
               var status = xhr.status;
               if (status >= 200 && status < 300) {
                   options.success && options.success(xhr.responseText, xhr.responseXML);
               } else {
                   options.fail && options.fail(status);
               }
           }
        }

        if (options.type == "GET") {
           xhr.open("GET", options.url + "?" + params, true);
           xhr.send(null);
        } else if (options.type == "POST") {
           xhr.open("POST", options.url, true);
           //设置表单提交时的内容类型
           xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
           xhr.send(params);
        }
    }

    /**
     * submit
     */
    function submit(params, reportData) {
        ajax({
            url: params.url,      //请求地址
            type: "POST",         //请求方式
            data: reportData,     //请求参数
            dataType: "json",
            success: function (response, xml) {
                // 此处放成功后执行的代码
                params.successCallBack&&params.successCallBack(response, xml);
            },
            fail: function (status) {
                // 此处放失败后执行的代码
                params.failCallBack&&params.failCallBack(status);
            }
        });
    }
    /*
    *格式化参数
    */
    function formatParams(data) {
       var arr = [];
       for (var name in data) {
           arr.push(encodeURIComponent(name) + "=" + encodeURIComponent(data[name]));
       }
       arr.push(("v=" + Math.random()).replace(".",""));
       return arr.join("&");
    }


    /*
    * 合并对象，将配置的参数也一并上报
    */
    function cloneObj(oldObj) { //复制对象方法
      if (typeof(oldObj) != 'object') return oldObj;
      if (oldObj == null) return oldObj;
      var newObj = new Object();
      for (var prop in oldObj)
        newObj[prop] = oldObj[prop];
      return newObj;
    };

    function extendObj() { //扩展对象
      var args = arguments;
      if (args.length < 2) {return;}
      var temp = cloneObj(args[0]); //调用复制对象方法
      for (var n = 1,len=args.length; n <len; n++){
        for (var index in args[n]) {
          temp[index] = args[n][index];
        }
      }
      return temp;
    }

   /**
   * 核心代码区
   **/
   var badJsReport=function(params){
      if(!params.url){return}
      window.onerror = function(msg,url,line,col,error){
          //采用异步的方式,避免阻塞
          setTimeout(function(){

              //不一定所有浏览器都支持col参数，如果不支持就用window.event来兼容
              col = col || (window.event && window.event.errorCharacter) || 0;
              defaults.url = url;
              defaults.line = line;
              defaults.col =  col;
              defaults.logDt = new Date();

              if (error && error.stack){
                  //如果浏览器有堆栈信息，直接使用
                  defaults.msg = error.stack.toString();
              }
              else if (arguments.callee){
                  //尝试通过callee拿堆栈信息
                  var ext = [];
                  var fn = arguments.callee.caller;
                  var floor = 3;  //这里只拿三层堆栈信息
                  while (fn && (--floor>0)) {
                     ext.push(fn.toString());
                     if (fn  === fn.caller) {
                          break;//如果有环
                     }
                     fn = fn.caller;
                  }
                  defaults.msg = ext.join(",");
                }
                // 合并上报的数据，包括默认上报的数据和自定义上报的数据
                var reportData=extendObj(params.data || {},defaults);

                // 把错误信息发送给后台
                submit(params, reportData);

              // console.log(reportData)
              // myDB.ready(function (e, me) {
              //     me.addLog("asdfsadasdasdsdas");
              //     console.log(me)
              // })
          },0);

          // return true;   //错误不会console浏览器上,如需要，可将这样注释
      };

  }

    var myDB = {
        db: null,
        ready :function(callback) {
            var self = this;
            var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB
            var request = indexedDB.open('mydb', 1);

            request.onsuccess = function(e) {
                self.db = e.target.result;
                console.log("indexdb request succ")
                setTimeout(function() {
                    callback(null, self);
                }, 500);

            }
            request.onerror = function (e) {
                callback(e);
                console.log("indexdb request error");
                return true;
            }
            request.onupgradeneeded = function(e) {
                var db = e.target.result;
                if (!db.objectStoreNames.contains('logs')) {
                    db.createObjectStore('logs', { autoIncrement: true });
                }
                console.log("数据库升级");
            };

        },
        insertToDB: function(log) {
            var store = this.getStore();
            var request = store.add(log);
            request.onsuccess = function (event) {
                console.log('数据写入成功');
            };

            request.onerror = function (event) {
                console.log('数据写入失败');
            }
        },
        addLog: function(log) {
            if (!this.db) {
                return;
            }
            this.insertToDB(log);
        },
        addLogs: function(logs) {
            if (!this.db) {
                return;
            }

            for (var i = 0; i < logs.length; i++) {
                this.addLog(logs[i]);
            }

        },
        getLogs: function(opt, callback) {
            if (!this.db) {
                return;
            }
            var store = this.getStore();
            var request = store.openCursor();
            var result = [];
            request.onsuccess = function(event) {
                var cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.time >= opt.start && cursor.value.time <= opt.end && cursor.value.id == opt.id && cursor.value.uin == opt.uin) {
                    result.push(cursor.value);
                    }
                    //# cursor.continue
                    cursor["continue"]();
                } else {
                    callback(null, result);
                }
            };
            request.onerror = function(e) {
                callback(e);
                return true;
            };
        },
        clearDB: function(daysToMaintain) {
            if (!this.db) {
                return;
            }

            var store = this.getStore();
            if (!daysToMaintain) {
                store.clear();
                return;
            }
            var range = (Date.now() - (daysToMaintain || 2) * 24 * 3600 * 1000);
            var request = store.openCursor();
            request.onsuccess = function(event) {
                var cursor = event.target.result;
                if (cursor && (cursor.value.time < range || !cursor.value.time)) {
                    store["delete"](cursor.primaryKey);
                    cursor["continue"]();
                }
            };
        },
        getStore: function() {
            return this.db.transaction(['logs'], 'readwrite').objectStore("logs");
        }
    }

    var T = {
        isOBJByType: function(o, type) {
            return Object.prototype.toString.call(o) === "[object " + (type || "Object") + "]";
        },

        isOBJ: function(obj) {
            var type = typeof obj;
            return type === "object" && !!obj;
        },
        isEmpty: function(obj) {
            if (obj === null) return true;
            if (T.isOBJByType(obj, "Number")) {
                return false;
            }
            return !obj;
        },
        extend: function(src, source) {
            for (var key in source) {
                src[key] = source[key];
            }
            return src;
        },
        processError: function(errObj) {
            try {
                if (errObj.stack) {
                    var url = errObj.stack.match("https?://[^\n]+");
                    url = url ? url[0] : "";
                    var rowCols = url.match(":(\\d+):(\\d+)");
                    if (!rowCols) {
                        rowCols = [0, 0, 0];
                    }

                    var stack = T.processStackMsg(errObj);
                    return {
                        msg: stack,
                        rowNum: rowCols[1],
                        colNum: rowCols[2],
                        target: url.replace(rowCols[0], ""),
                        _orgMsg: errObj.toString()
                    };
                } else {
                    //ie 独有 error 对象信息，try-catch 捕获到错误信息传过来，造成没有msg
                    if (errObj.name && errObj.message && errObj.description) {
                        return {
                            msg: JSON.stringify(errObj)
                        };
                    }
                    return errObj;
                }
            } catch (err) {
                return errObj;
            }
        },

        processStackMsg: function(error) {
            var stack = error.stack
                .replace(/\n/gi, "")
                .split(/\bat\b/)
                .slice(0, 9)
                .join("@")
                .replace(/\?[^:]+/gi, "");
            var msg = error.toString();
            if (stack.indexOf(msg) < 0) {
                stack = msg + "@" + stack;
            }
            return stack;
        },

        isRepeat: function(error) {
            if (!T.isOBJ(error)) return true;
            var msg = error.msg;
            var times = _log_map[msg] = (parseInt(_log_map[msg], 10) || 0) + 1;
            return times > _config.repeat;
        }
    };

  window.badJsReport=badJsReport;

})();

/*===========================
badJsReport AMD Export
===========================*/
if (typeof(module) !== 'undefined'){
    module.exports = window.badJsReport;
}
else if (typeof define === 'function' && define.amd) {
    define([], function () {
        // 'use strict';
        return window.badJsReport;
    });
}

var getUrlParams = function (name) {
    var url = location.search;
    var params = {};
    if (url.length === 0) {
        url = location.hash
    }
    if (url.indexOf('?') !== -1) {
        var str = url.split("?")[1];
        var strs = str.split('&');
        for (var i = 0; i < strs.length; i++) {
            params[strs[i].split('=')[0]] = decodeURI(strs[i].split('=')[1]);
        }
    }

    if (name && name.length > 0) {
        if (objectValueExist(params, name)) {
            return params[name];
        }
        return '';
    }

    return params;
}

var objectValueExist = function (object, key) {
    return (
        object != null
        && object != undefined
        && object.hasOwnProperty(key)
        && object[key] != null
        && object[key] != undefined
        && object[key] != 'null'
        && object[key] != 'undefined'
    );
}

badJsReport({
    url:'/logReport/log_report/logErrorReport', //发送到后台的url  *必须
    data:{
        user_id:getUrlParams('user_id'),
        activity_id:1,
        activity_name:'消灭病毒'
    },   //自定义添加上报参数，比如app版本，浏览器版本  -可省略
    successCallBack:function(response, xml){
        // 发送给后台成功的回调，-可省略
    },
    failCallBack:function(error){
        // 发送给后台失败的回调，-可省略
    }
})
