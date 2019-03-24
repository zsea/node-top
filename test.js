
var alitop = require('./index');
//global.debug=console.log;

var top = new alitop('', '',{
    
});
top.Execute("taobao.trade.fullinfo.get",{
    fields:"tid,type,status,payment,orders,promotion_details,received_payment",
    "tid":"",
    session:""
}).then(function(response){
    console.log(JSON.stringify(response,null,4));
});
/*
top.Listen(async function(message){
    console.log(message);
})*/

