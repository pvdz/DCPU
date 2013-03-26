if (typeof window == 'undefined') var Dcpu = require('../dcpu.js');
var methods = Dcpu.prototype;

var tests = [
  function constructorShouldWork(){
    new Dcpu('food');
		return true;
  },
  function nextShouldCallExecute(){
    var ran = false;
    var context = {
      nextWord: function(){},
      execute: function(){
        ran = true;
      },
			logWord: function(){}
    };
		methods.next.call(context);
    return ran;
  },
  function nextShouldDeconstructWord(){
    var ok = false;
    var context = {
			logWord: function(){},
      nextWord: function(){
        return 0x0c21;
      },
      execute: function(op,a,b){
        ok = op==1 && a==2 && b==3;
      }
    };
    methods.next.call(context);
    return ok;
  },
  function executeCallsOpWithOp(){
    var called = false;
    var context = {
      op: function(){
        called = true;
      }
    };
    methods.execute.call(context, 1);
    return called;
  },
  function executeCallsNonBasicOpWithoutOp(){
    var called = false;
    var context = {
      nonBasicOp: function(){
        called = true;
      }
    };
    methods.execute.call(context, 0, 1);
    return called;
  },
  function nextWordReturnsRamAtPc(){
    var context = {
			PC: 5,
      RAM: {5:'foo'}
    };
    var value = methods.nextWord.call(context);
    return value === 'foo';
  },
  function nextWordIncrementsPC(){
    var context = {
			PC: 5,
			RAM:{}
    };
    var value = methods.nextWord.call(context);
    return context.PC === 6;
  },
  function opCallsAtForSetters(){
    var ops = ['SET','ADD','SUB','MUL','DIV','MOD','SHL','SHR','AND','BOR','XOR'];
    return !ops.some(function(o,i){
      var called = false;
      var context = {
        ops: ops,
        '@': function(){
          called = true;
        }
      };
      methods.op.call(context, i);
      return !called;
    });
  },
  function opDefersJumps(){
    var ops = ['IFE','IFN','IFG','IFB'];
    return !ops.some(function(o,i){
      var called = -1;
      var context = {
        ops: ops,
        IFE: function(){ called = 0; },
        IFN: function(){ called = 1; },
        IFG: function(){ called = 2; },
        IFB: function(){ called = 3; },
      };
      methods.op.call(context, i);
      return called != i;
    });
  },
  function nonBasicOpJustRefersDynamicallyToo(){
    var called = false;
    var context = {
			nbops:[null,'foo'],
      foo: function(){
        called = true;
      }
    };
    methods.nonBasicOp.call(context, 1,2);
    return called;
  },
  function nonBasicOpCrashesForReserved(){
    var crashed = false;
    var context = {
      nbops:[null,'foo'],
		};
    try {
      methods.nonBasicOp.call(context, 'foo', 0, 2, 2);
    } catch(e) {
      crashed = true;
    }
    return crashed;
  },
  function nonBasicOpThinkZeroIsReservedToo(){
    var crashed = false;
    var context = {
      nbops:[null,'foo'],
		};
    try {
      methods.nonBasicOp.call(context, 'foo', 0, 0, 2);
    } catch(e) {
      crashed = true;
    }
    return crashed;
  },
  function fetchPushShouldDecSp(){
    var context = {
			values:{0x1a:'PUSH'},
      SP: 0,
      RAM: {}
    };
    methods.fetch.call(context, 0x1a);
    return context.SP === -1;
  },
  function fetchPushReturnsRamAtSpAfterDecrement(){
    var target = {};
    var context = {
      values:{0x1a:'PUSH'},
      SP: 1,
      RAM: [target]
    };
    var result = methods.fetch.call(context, 0x1a);
    return result === target;
  },
  function fetchPeekLeavesSpAlone(){
    var context = {
      values:{0x19:'PEEK'},
      SP: 0,
      RAM: []
    };
    methods.fetch.call(context, 0x19);
    return context.SP === 0;
  },
  function fetchPeekReturnsRamAtSp(){
    var target = {};
    var context = {
      values:{0x19:'PEEK'},
      SP: 0,
      RAM: [target]
    };
    var result = methods.fetch.call(context, 0x19);
    return result === target;
  },
  function fetchPopIncrementsSp(){
    var context = {
      values:{0x18:'POP'},
      SP: 0,
      RAM: []
    };
    methods.fetch.call(context, 0x18);
    return context.SP === 1;
  },
  function fetchPopReturnsRamAtSpBeforeChangingSp(){
    var target = {};
    var context = {
      values:{0x18:'POP'},
      SP: 0,
      RAM: [target]
    };
    var result = methods.fetch.call(context, 0x18);
    return result === target;
  },
  function fetchLiteralsShouldReturnLiterals(){
		// Array.apply(null,Array(20)) creates a _dense_ array with 20 elements
		return !Array.apply(null, Array(20)).map(function(x,i){ return i+0x20; }).some(function(val){
      var context = {
				values:{}
			};
      var result = methods.fetch.call(context, val);
      return !(result === (val-0x20));
    });
  },
  function fetchPcAndReg(){
    return ![0x10,0x11,0x12,0x13,0x14,0x15,0x16,0x17].some(function(val){
      var context = {
        values:{
          0x10:'[[PC++]+Q]',0x11:'[[PC++]+Q]',0x12:'[[PC++]+Q]',0x13:'[[PC++]+Q]',0x14:'[[PC++]+Q]',0x15:'[[PC++]+Q]',0x16:'[[PC++]+Q]',0x17:'[[PC++]+Q]'
        },
        Q:5,
        nextWord: function(){ return 10; },
        RAM: {15:'yes'}
      };
      var result = methods.fetch.call(context, val);
      return !(result === 'yes');
    });
  },
  function fetchRegister(){
    return ![0x8,0x9,0xa,0xb,0xc,0xd,0xe,0xf].some(function(val){
      var context = {
        values:{
          0x8:'[Q]',0x9:'[Q]',0xa:'[Q]',0xb:'[Q]',0xc:'[Q]',0xd:'[Q]',0xe:'[Q]',0xf:'[Q]'
        },
        Q:5,
        RAM: {5:'yes'}
      };
      var result = methods.fetch.call(context, val);
      return !(result === 'yes');
    });
  },
  function fetchRamAtNextWord(){
    var context = {
      values:{0x1e:'[[PC++]]'},
      nextWord: function(){ return 'yes'; },
      RAM: {yes:'foo'}
    };
    var result = methods.fetch.call(context, 0x1e);
    return result === 'foo';
  },
  function fetchNextWord(){
    var context = {
      values:{0x1f:'[PC++]'},
      nextWord: function(){ return 'yes'; },
    };
    var result = methods.fetch.call(context, 0x1f);
    return result === 'yes';
  },
	function fetchRegisterReturnsRegister(){
		return ![0,1,2,3,4,5,6,7].some(function(val){
	    var context = {
	      values:['Q','Q','Q','Q','Q','Q','Q','Q'],
	      Q: 'foo'
	    };
	    var result = methods.fetch.call(context, val);
	    return !(result === 'foo');
		});
	},
  function applyOp(){
    var called = 0;
    var context = {
      ops: {1:'foo'},
      foo: function(){ called = true; },
    };
    methods.applyOp.call(context, 1);
    return called;
  },
  function atFetchesAandB(){
    var called = 0;
    var context = {
      registers: [],
      fetch: function(){ ++called; },
      storeToReg: function(){},
      storeToRam: function(){},
			applyOp: function(){},
    };
    methods['@'].call(context, 1, 2, 3);
    return called == 2;
  },
  function atStoresToReg(){
    var called = false;
    var context = {
      registers: ['bar'],
      fetch: function(){},
      storeToReg: function(){ called = true; },
      storeToRam: function(){},
      applyOp: function(){},
    };
    methods['@'].call(context, 0, 0);
    return called;
  },
  function atStoresToRam(){
    var called = false;
    var context = {
      registers: {},
      fetch: function(){},
      storeToReg: function(){},
      storeToRam: function(){ called = true; },
      applyOp: function(){},
    };
    methods['@'].call(context, 'op', 0x10, 'bar');
    return called;
  },
  function atIgnoresStoresForLiterals(){
    var called = false;
    var context = {
      registers: [],
      fetch: function(){ },
      storeToReg: function(){ called = true; },
      storeToRam: function(){ called = true; },
      applyOp: function(){},
    };
    methods['@'].call(context, 0, 0x21);
    return called == false;
  },
  function storeToRegDoesJustThat(){
    var context = {};
    methods.storeToReg.call(context, 'foo', 'bar');
    return context.foo == 'bar';
  },
  function storeToRamDoesJustThat(){
    var context = {
      RAM: [],
			values: {'foo':'foobarbbQ'},
			nextWord: function(){ return 'xxxx'; },
			Q: 'reg'
    };
    methods.storeToRam.call(context, 'foo', 'bar');
    return context.RAM['xxxxreg'] == 'bar';
  },
  function setIsIdentityFunction(){
    var context = {};
    var value = methods.SET.call(context, 'foo', 'bar');
    return value == 'bar';
  },
  function addJustAdds(){
    var context = {};
    var value = methods.ADD.call(context, 10,20);
    return value == 30;
  },
  function addUnsetsOWithoutOverflow(){
    var context = {
      O: 1
    };
    methods.ADD.call(context, 10,20);
    return context.O == 0;
  },
  function addSetsOWithOverflow(){
    var context = {
      O: 0
    };
    methods.ADD.call(context, 0xff00,0x0f00);
    return context.O == 1;
  },
  function addAlwaysReturnsUint16(){
    var context = {};
    var value = methods.ADD.call(context, 0xff00,0x0f00);
    return value == 0x0e01;
  },
  function subJustSubtracts(){
    var context = {};
    var value = methods.SUB.call(context, 10, 5);
    return value == 5;
  },
  function subUnsetsOWithoutUnderflow(){
    var context = {
      O: 1
    };
    methods.SUB.call(context, 20,10);
    return context.O == 0;
  },
  function subSetsOWithUnderflow(){
    var context = {
      O: 0
    };
    methods.SUB.call(context, 10,20);
    return context.O == 1;
  },
  function addAlwaysReturnsUint16(){
    var context = {};
    var value = methods.SUB.call(context, 10,20);
    return value == 0xfff5;
  },
  function mulJustMultiplies(){
    var context = {};
    var value = methods.MUL.call(context, 10, 5);
    return value == 50;
  },
  function mulSetsOToOverflow(){
    var context = {};
    var value = methods.MUL.call(context, 0xfff0, 5);
    return context.O == 4;
  },
  function mulSetsOToOverflowEvenZero(){
    var context = {};
    var value = methods.MUL.call(context, 10, 5);
    return context.O == 0;
  },
  function mulReturnsUint16(){
    var context = {};
    var value = methods.MUL.call(context, 0xfff0, 5);
    return value == 0xffb0;
  },
  function divJustDivides(){
    var context = {};
    var value = methods.DIV.call(context, 10, 5);
    return value == 2;
  },
  function divSetsOToOverflow(){
    var context = {};
    var value = methods.DIV.call(context, 5, 10);
    return context.O == 0x8000;
  },
  function divReturnsIntegers(){
    var context = {};
    var value = methods.DIV.call(context, 5, 10);
    return value === 0;
  },
  function divZeroReturnsZero(){
    var context = {};
    var value = methods.DIV.call(context, 5, 0);
    return value === 0;
  },
  function divZeroClearsO(){
    var context = {};
    var value = methods.DIV.call(context, 5, 0);
    return context.O === 0;
  },
  function modJustMods(){
    var context = {};
    var value = methods.MOD.call(context, 10, 8);
    return value == 2;
  },
  function modReturnsZeroForZero(){
    var context = {};
    var value = methods.MOD.call(context, 5, 0);
    return value == 0;
  },
  function shlShiftsLeft(){
    var context = {};
    var value = methods.SHL.call(context, 5, 2);
    return value == 20;
  },
  function shlSetsOToOverflow(){
    var context = {};
    var value = methods.SHL.call(context, 0xc000, 2);
    return context.O == 3;
  },
  function shrShiftsRight(){
    var context = {};
    var value = methods.SHR.call(context, 20, 2);
    return value == 5;
  },
  function shrSetsOToOverflow(){
    var context = {};
    var value = methods.SHR.call(context, 2, 5);
    return context.O == 0x1000;
  },
  function andJustAnds(){
    var context = {};
    var value = methods.AND.call(context, 4, 5);
    return value == 4;
  },
  function borJustOrs(){
    var context = {};
    var value = methods.BOR.call(context, 2, 5);
    return value == 7;
  },
  function xorJustXors(){
    var context = {};
    var value = methods.XOR.call(context, 1, 5);
    return value == 4;
  },
  function ifeSkipsIfNotEqual(){
    var context = {
      PC: 5,
			fetch: function(x){ return x; }
    };
    var value = methods.IFE.call(context, 1, 5);
    return context.PC == 6;
  },
  function ifeIdlesIfEqual(){
    var context = {
      PC: 5,
      fetch: function(x){ return x; }
    };
    var value = methods.IFE.call(context, 15, 15);
    return context.PC == 5;
  },
  function ifnSkipsIfEqual(){
    var context = {
      PC: 5,
      fetch: function(x){ return x; }
    };
    var value = methods.IFN.call(context, 1, 5);
    return context.PC == 5;
  },
  function ifnIdlesIfNotEqual(){
    var context = {
      PC: 5,
      fetch: function(x){ return x; }
    };
    var value = methods.IFN.call(context, 15, 15);
    return context.PC == 6;
  },
  function ifgSkipsIfLesser(){
    var context = {
      PC: 5,
			fetch: function(x){ return x; }
    };
    var value = methods.IFG.call(context, 1, 5);
    return context.PC == 6;
  },
  function ifgSkipsIfEqual(){
    var context = {
      PC: 5,
      fetch: function(x){ return x; }
    };
    var value = methods.IFG.call(context, 1, 1);
    return context.PC == 6;
  },
  function ifgIdlesIfGreater(){
    var context = {
      PC: 5,
      fetch: function(x){ return x; }
    };
    var value = methods.IFG.call(context, 15, 5);
    return context.PC == 5;
  },
  function ifbSkipsIfEqualBits(){
    var context = {
      PC: 5,
      fetch: function(){ return 5; }
    };
    var value = methods.IFB.call(context); // 5&4 == 4
    return context.PC == 5;
  },
  function ifbIdlesIfNoEqualBits(){
    var i = 0;
		var context = {
      PC: 5,
			fetch: function(){ return ++i; }
    };
    var value = methods.IFB.call(context);
    return context.PC == 6;
  },
  function jsrPushesAddrOfNextWord(){
    var context = {
      RAM: [],
      PC: 5,
      SP: 1,
    };
    methods.JSR.call(context);
    return context.RAM[0] == 6;
  },
  function jsrDecrementsSp(){
    var context = {
      RAM: [],
      PC: 5,
      SP: 1,
    };
    methods.JSR.call(context);
    return context.SP == 0;
  },
  function jsrUpdatesPCToArg(){
    var context = {
      RAM: [],
      PC: 5,
      SP: 1,
    };
    methods.JSR.call(context, 30);
    return context.PC == 30;
  },
];


var good = 0;
var bad = 0;
var crash = 0;
for (var i=0; i<tests.length; ++i) {
  try {
    if (tests[i]()) ++good;
    else {
      ++bad;
      console.warn('bad',tests[i].toString())
    }
  } catch(e){
    ++crash;
    console.error('crash',tests[i].toString())
		console.error(e, new Error(e));
  }
}

if (typeof window != 'undefined') {
  document.body.style.backgroundColor = (crash||bad?'red':'green');
  document.body.style.color = 'white';
  document.body.innerHTML = 'Tests: '+good+' good, '+bad+' bad, '+crash+' crashed';
} else {
  console.log('Test results: '+good+' good, '+bad+' bad, '+crash+' crashed');
}