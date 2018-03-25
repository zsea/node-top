var alitop = require('./index');
global.debug=console.log;
var top = new alitop('', '');
top.Execute("taobao.time.get").then(function(response){
    console.log(response);
});
/*
top.Listen(async function(message){
    console.log(message);
})*/
