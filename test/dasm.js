if (typeof window == 'undefined') var Dasm = require('../Dasm.js');
var methods = Dasm.prototype;

var uops = ['JSR'];
var bops = ['SET', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'SHL', 'SHR', 'AND', 'BOR', 'XOR', 'IFE', 'IFN', 'IFG', 'IFB'];
var ops = bops.concat(uops);

var regLits = ['A','B','C','X','Y','Z','I','J'];
var regs = regLits.concat(['PC','SP','O', 'PUSH', 'POP', 'PEEK']);
var nums = ['0', '15', '0x1000', '0x435'];
var labels = ['foo', 'bar1', 's', 'under_test', '_prefix'];

var values = [].concat(
  regs,
	regs.map(function(r){ return '['+r+']'; }),
	nums,
	labels
);
// generate the [num+reg] and [reg+num] kind of operands
regLits.forEach(function(r){
	nums.concat(labels).forEach(function(s){
    values.push('['+s+'+'+r+']');
    values.push('['+r+'+'+s+']');
	});
});

var rand = function(arr){
  return arr[Math.floor(Math.random() * arr.length)];
};

var nextOp = function(){
	var op = rand(ops);
	var a = rand(values);
	if (uops.indexOf(op)>=0) {
		return op+' '+a;
	} else {
		var b = rand(values);
		return op+' '+a+(Math.random()<0.5?',':'')+' '+b;
	}
};
var nextLabel = function(){
	return ':'+rand(labels);
};
var nextComment = function(){
	return '; this is a comment';
};
var next = function(){
	var arr = [];
	while (Math.random() < 0.2) arr.push(nextLabel());
	if (Math.random() > 0.2) arr.push(nextOp());
	if (Math.random() < 0.2) arr.push(nextComment());
	return arr.join(' ');
};



