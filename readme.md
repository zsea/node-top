基于async/await实现的淘宝开放平台sdk

# 使用方法

```javascript
var alitop=require('node-top');
var top=new alitop(appkey,appsecret);
var response=await top.Execute(method,args);
```
# 设置

* timeout:指定超时时间，默认*30*秒，单位```ms```

* retry_times:当发生错误时，也可以通过环境变量```TOP_MAX_RETRY_TIMES```指定，最大重试次数，默认5次

* retry_code:自定义的可以重试的错误代码，默认：[]。淘宝平台的isp错误都会重试。

* rest_url:淘宝开放平台接口调用地址，也可以通过环境变量```TOP_REST_URL```指定，默认值：```http://gw.api.taobao.com/router/rest```

* retry_interval:发生可重试错误的间隔时间，也可以通过环境变量```TOP_RETRY_INTERVAL```指定，单位```ms```，默认值：*5000*

* TOP_PROXY:通过代理服务器访问TOP平台。也可以通过环境变量```TOP_PROXY```设置代理服务器。

# 附件上传

对于文件上传，可以直接指定参数为可读流。也可以指定为一个对象

```javascript
{
    attachment:true,
    value:fs.createReadStream('./1.jpg'),
    options:{
        knownLength:1,
        filename: 'unicycle.jpg',
        contentType: 'image/jpg',
    }
}
```

# 日志记录

每一个top实例，都可以侦听```completed```事件来记录日志。

on方法侦听函数返回两个参数：

* request:请求top时的数据

* response:top的响应数据

```javascript
var alitop=require('node-top');
var top=new alitop(appkey,appsecret).on('completed',function(request,response){});
var response=await top.Execute(method,args);
```

# 消息接收

> 该功能代码复制并修改于ali-topSdk

每一个top实例，可以调用方法Listen来监听服务器的消息。

Listen包含三个参数：

* group_name:监听的消息分组，默认值：default

* url:连接到的淘宝消息服务器，也可以通过环境变量TOP_TMC_URL设置，默认值：ws://mc.api.taobao.com/

* handler:消息处理函数,一个async函数或者Promise对象

```javascript
var alitop=require('node-top');
var top=new alitop(appkey,appsecret);
top.Listen(async function(message){
    console.log(message);
})
```

# 更新日志

* 2019-03-24 增加通过环境变量设置代理服务器。

* 2018-03-19 增加通过环境变量设置重试次数和重试间隔

* 2018-03-19 增加通过环境变量设置接口地址

* 2017-05-22 修正不能上传附件

* 2017-05-18 增加消息接收

* 2017-05-05 修复网络错误不重试。