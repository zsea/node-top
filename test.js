var alitop = require('./index');
global.debug=console.log;
var top = new alitop('', '');

top.Listen(async function(message){
    console.log(message);
})
