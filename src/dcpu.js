var Dcpu = (function(){
// constants
var
    // expressions (a or b):
    A=0x00,
    B=0x01,
		C=0x02,
		X=0x03,
		Y=0x04,
		Z=0x05,
		I=0x06,
		J=0x07,
		readA=0x08,
		readB=0x09,
		readC=0x0a,
		readX=0x0b,
		readY=0x0c,
		readZ=0x0d,
		readI=0x0e,
		readJ=0x0f,
		readPCA=0x10,
		readPCB=0x11,
		readPCC=0x12,
		readPCX=0x13,
		readPCY=0x14,
		readPCZ=0x15,
		readPCI=0x16,
		readPCJ=0x17,
		POP= 0x18,// [--SP] (when in a)
		PUSH=0x18,// [SP++] (when in b)
		PEEK=0x19,// [SP]
		PICK=0x1a,// [SP+[PC++]]
		SP=  0x1b,
		PC=  0x1c,
		EX=   0x1d,
		READNEXTWORD=0x1e,// [[PC++]]
		NEXTWORD= 0x1f,// [PC++]
		lit_neg1=0x20,// ~ 0x3f, -1 ~ 30
		lit_zero=0x21,
    lit_0x01=0x23,
    lit_0x02=0x24,
    lit_0x03=0x25,
    lit_0x04=0x26,
    lit_0x05=0x27,
    lit_0x06=0x28,
    lit_0x07=0x29,
    lit_0x08=0x2a,
    lit_0x09=0x2b,
    lit_0x0a=0x2c,
    lit_0x0b=0x2d,
    lit_0x0c=0x2f,
    lit_0x0d=0x30,
    lit_0x0e=0x31,
    lit_0x0f=0x32,
    lit_0x10=0x33,
    lit_0x11=0x34,
    lit_0x12=0x35,
    lit_0x13=0x36,
    lit_0x14=0x37,
    lit_0x15=0x38,
    lit_0x16=0x39,
    lit_0x17=0x3a,
    lit_0x18=0x3b,
    lit_0x19=0x3c,
    lit_0x1a=0x3d,
    lit_0x1b=0x3e,
    lit_0x1c=0x3f,
		values=[A,B,C,X,Y,Z,I,J,readA,readB,readC,readX,readY,readZ,readI,readJ,readPCA,readPCB,readPCC,readPCX,readPCY,readPCZ,readPCI,readPCJ,POP,PEEK,PICK,SP,PC,EX,READNEXTWORD,NEXTWORD,lit_neg1,lit_zero,lit_0x01,lit_0x02,lit_0x03,lit_0x04,lit_0x05,lit_0x06,lit_0x07,lit_0x08,lit_0x09,lit_0x0a,lit_0x0b,lit_0x0c,lit_0x0d,lit_0x0e,lit_0x0f,lit_0x10,lit_0x11,lit_0x12,lit_0x13,lit_0x14,lit_0x15,lit_0x16,lit_0x17,lit_0x18,lit_0x19,lit_0x1a,lit_0x1b,lit_0x1c],
		valuesCost=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],

    // ops
		SET=0x01,// b=a
		ADD=0x02,// b+=a, ex=overflow?1=0
		SUB=0x03,// b-=a, ex=underflow?0xffff:0
		MUL=0x04,// b*=a, ex=((b*a)>>16)&0xffff (a,b as unsigned)
		MLI=0x05,// b*=a, ex=((b*a)>>16)&0xffff (a,b as signed)
		DIV=0x06,// b/=a, ex=((b<<16)/a)&0xffff (a,b as unsigned, if a=0 then b=ex=0)
		DVI=0x07,// b/=a, ex=((b<<16)/a)&0xffff (a,b as signed, if a=0 then b=ex=0, , rounds towards 0)
		MOD=0x08,// b%=a, (a,b as signed, if a=0 then b=0)
		MDI=0x09,// b%=a, (a,b as unsigned, if a=0 then b=0, rounds towards 0)
		AND=0x0a,// b&=a
		BOR=0x0b,// b|=a
		XOR=0x0c,// b^=a
		SHR=0x0d,// b>>>=a, ex=((b<<16)>>a)&0xffff
		ASR=0x0e,// b>>=a, ex=((b<<16)>>>a)&0xffff (b as signed)
		SHL=0x0f,// b<<=a, ex=((b<<a)>>16)&0xffff
		IFB=0x10,// if b&a!=0
		IFC=0x11,// if b&a=0
		IFE=0x12,// if b==a
		IFN=0x13,// if b!=a
		IFG=0x14,// if b>a (unsigned)
		IFA=0x15,// if b>a (signed)
		IFL=0x16,// if b<a (unsigned)
		IFU=0x17,// if b<a (signed)
		ADX=0x1a,// b=b+a+ex, ex=overflow?1:0
		SBX=0x1b,// b=b-a+ex, ex=underflow?0xffff:0
    STI=0x1e,// b=a, i+=1, j+=j
    STD=0x1f,// b=a, i-=1, j-=j
		ops=[null,SET,ADD,SUB,MUL,MLI,DIV,DVI,MOD,MDI,AND,BOR,XOR,SHR,ASR,SHL,IFB,IFC,IFE,IFN,IFG,IFA,IFL,IFU,null,null,ADX,SBX,null,null,STI,STD],
		opsCost=[0,1, 2,  2,  2,  2,  3,  3,  3,  1,  1,  1,  2,  2,  2,  2,  2/3,2/3,2/3,2/3,2/3,2/3,2/3,2/3,0,   0,   3,  3,  0,   0,   2,  2],
		at=[SET, ADD, SUB, MUL, MLI, DIV, DVI, MOD, MDI, AND, BOR, XOR, SHR, ASR, SHL],// (simple) a@=b ops
		conditionals=[IFB, IFC, IFE, IFN, IFG, IFA, IFL, IFU],// the ifs

		// ops2:
		JSR=0x01,// set [pc++] push; set a pc
		BRK=0x02,
		LOG=0x03,
		HCF=0x07,// halt and catch fire (?), fucks up cpu unrecoverably (will need outside maintenance to fix. reboot/reset, duct tape, magic): http://www.reddit.com/r/dcpu16/comments/ssiq2/release_candidate_1/c4gsprs?context=3
		INT=0x08,// software int with message a
		IAG=0x09,// a=ia
		IAS=0x0a,// ia=a
		HWN=0x10,// a=number of connected hardware devices
		HWQ=0x11,// query hw a, AB=id, C=ver, XY=manufacturer
		HWI=0x12,// hw interrupt to a
		ops2=[null,JSR,BRK,LOG,null,null,null,HCF,INT,IAG,IAS,null,null,null,null,null,HWN,HWQ,HWI],
		ops2Cost=[0,3, 0,  0,  0,   0,   0,   9,  4,  1,  1,  0,   0,   0,   0,   0,   2,  4,  4/5],
_=0;


var Dcpu = function(input, options){
  for (key in options) if (options.hasOwnProperty(key)) this[key] = options[key];

	// never accessed directly, see #run()
	this.inputRam = input;
//	console.log(this.inputRam.map(function(v){ return '0x'+v.toString(16)}))
};
Dcpu.prototype = {
  hz: 10, // cpu clockspeed speed

	RAM: null,
	A:0,
	B:0,
	C:0,
	X:0,
	Y:0,
	Z:0,
	I:0,
	J:0,
  PC:0,
  SP:0,
  EX:0,
  IA:0,

	cycles: 0,
	steps: 0,
	crashed: false,
	
	interruptsToFire: null,
	intQueue: null,

  // "arrays" (just objects) with functions for addresses to plugin to
  onRead: null,
	onWrite: null,

  /**
   * Replace program in ram with given program without resetting anything
   * 
   * @param {number[]} input
   */
  updateInput: function(input){
		this.inputRam = input;
		for (var i=0; i<input.length; ++i) {
			this.RAM[i] = input[i];
		}
	},
	/**
	 * Re-initialize the cpu
	 * 
   * @return {Dcpu}
	 */
  reset: function(){
		clearInterval(this.timer);

    this.A = 0;
    this.B = 0;
    this.C = 0;
    this.X = 0;
    this.Y = 0;
    this.Z = 0;
    this.I = 0;
    this.J = 0;
    this.PC = 0;
    this.SP = 0;
    this.EX = 0;
		this.IA = 0;

    this.RAM = this.inputRam.slice(0);

    this.cycles = 0;
		this.steps = 0;
    this.crashed = false;

    this.interruptsToFire = [];
		this.intQueue = [];

		return this;
	},
	/**
	 * Read word from RAM. Applies registered (js) plugins that might take over
	 * 
	 * @param {number} adr
	 */
  read: function(adr){
    // "plugins". if they return a number, return that value instead
    if (this.onRead && this.onRead[adr]) {
      var v = this.onRead[adr].call(this);
      if (typeof v === 'number') return v;
    }

    return (this.RAM[adr] & 0xffff) >>> 0;
  },
  /**
   * Write word to RAM. Applies registered (js) plugins that might take over
   * 
   * @param {number} adr
   * @param {number} val
   */
  write: function(adr, val){
//    console.log("writing",val,"to",adr,adr.toString(16))
    // "plugins". if they return true, skip assigning the original value
    if (this.onWrite && this.onWrite[adr] && this.onWrite[adr].call(val) === true) return;

    this.RAM[adr] = val;
  },
  /**
   * Continuously run the cpu. Resets the cpu.
   * 
   * @param {Function} onStep
   * @param {Function} onStop
   * @return {Dcpu}
   */
	run: function(onStep, onStop){
		if (onStep) this.onStep = onStep;
		if (onStop) this.onStop = onStop;

		this.reset();
		this.cont();

		return this;
	},
	/**
	 * Stop running the cpu. Calls callback
	 */
	stop: function(){
		this.timer = clearInterval(this.timer);
		if (this.onStop) this.onStop();
	},
	/**
	 * Continue running the cpu, does not reset.
	 */
	cont: function(){
		this.timer = setInterval(function(){
      this.batch();
      if (this.crashed) this.stop(this.crashed);
    }.bind(this), 100);
	},
	/**
	 * Step n times without yielding, depending on current speed
	 */
	batch: function(){
		var count = this.hz / 10; // hz is steps per second. interval set to 100ms. so count is steps per interval
		for (var i=0; i<count; ++i) {
			this.step(i<count);
		}
	},
	/**
	 * Execute one op
	 * 
	 * @param {boolean} lastInBatch is this the last step in a batch of of steps? (If true, cpu will yield after this step)
	 */
	step: function(lastInBatch){
		if (this.crashed) return;

    // run one interrupt per one instruction
//    if (this.interruptsToFire.length) {
//			this.nextInterrupt();
//		}

		// value stored in last op, for output
		this.lastStore = null;
		// for cost, whether last condition failed (adds one cycle)
		this.lastCondition = null;
		// result of last conditional, if any
		this.lastCheck = null;

		// save initial pc (pc can be changed when reading values, might need it for writing)
		var pc = this.PC;

		var word = this.read(this.PC++);
		var op = word & 0x1f; // first five bits
		var b = (word & 0x3e0) >> 5; // five bits
		var a = (word & 0xfc00) >> 10; // six bits

		try {
		  var cost = this.execute(op,a,b);
		} catch(e){
			this.crashed = true;
			console.error(new Error(e));
		}

    this.cycles += cost;

    this.logWord(word, op, a, b, cost, pc);

    ++this.steps;

    if (this.onStep) this.onStep(this, lastInBatch);
	},
	logWord: function(word, op, a, b, cost, pc){
		return;
		var nexts = 1;
    console.log(
      '0x'+word.toString(16),
			!op?'':[null,'SET','ADD','SUB','MUL','MLI','DIV','DVI','MOD','MDI','AND','BOR','XOR','SHR','ASR','SHL','IFB','IFC','IFE','IFN','IFG','IFA','IFL','IFU',null,null,'ADX','SBX',null,null,'STI','STD'][op],
			op?'':[null,'JSR',null,null,null,null,null,'HCF','INT','IAG','IAS','HWN','HWQ','HWI'][b],
      !op?'':['A','B','C','X','Y','Z','I','J','[A]','[B]','[C]','[X]','[Y]','[Z]','[I]','[J]','[NEXT+A]','[NEXT+B]','[NEXT+C]','[NEXT+X]','[NEXT+Y]','[NEXT+Z]','[NEXT+I]','[NEXT+J]','POP','PEEK','PICK','SP','PC','EX','[[PC++]]','[PC++]','-1','0','0x01','0x02','0x03','0x04','0x05','0x06','0x07','0x08','0x09','0x0a','0x0b','0x0c','0x0d','0x0e','0x0f','0x10','0x11','0x12','0x13','0x14','0x15','0x16','0x17','0x18','0x19','0x1a','0x1b','0x1c'][b].replace(/\[PC\+\+\]/g,function(s){ return '0x'+(this.read(pc+(nexts++)).toString(16)); }.bind(this)),
      ['A','B','C','X','Y','Z','I','J','[A]','[B]','[C]','[X]','[Y]','[Z]','[I]','[J]','[NEXT+A]','[NEXT+B]','[NEXT+C]','[NEXT+X]','[NEXT+Y]','[NEXT+Z]','[NEXT+I]','[NEXT+J]','POP','PEEK','PICK','SP','PC','EX','[[PC++]]','[PC++]','-1','0','0x01','0x02','0x03','0x04','0x05','0x06','0x07','0x08','0x09','0x0a','0x0b','0x0c','0x0d','0x0e','0x0f','0x10','0x11','0x12','0x13','0x14','0x15','0x16','0x17','0x18','0x19','0x1a','0x1b','0x1c'][a].replace(/\[PC\+\+\]/g,function(s){ return '0x'+(this.read(pc+(nexts++)).toString(16)); }.bind(this)),
			'('+cost+' cycle'+(cost==1?'':'s')+')'
//			this.lastStore==null?'':'(stored '+this.lastStore+' | x'+this.lastStore.toString(16)+')',
//			this.lastCheck==null?'':this.lastCheck
    );
	},
	execute: function(op, a, b){
//    console.log("step",'op:','0x'+op.toString(16),'a:','0x'+a.toString(16),'b:','0x'+b.toString(16))
    if (op) return this.op(op, a, b);
    else if (b) return this.nonBasicOp(b, a);
		else throw new Error('execute: Reserved ('+op+','+b+')');
	},
	op: function(op, a, b){
		// we always fetch first b, then a
		var pcA = this.PC; // first NEXTWORD adr for this op. save it before fetch might change it
		var vb = this.fetch(b);
		var va = this.fetch(a, true);

    var cost = 0;
		if (at.indexOf(op)>=0) {
			cost += this.applyAt(op, va, vb, b, pcA);
		} else if (conditionals.indexOf(op)>=0) {
			cost += this.applyIf(op, va, vb);
		} else if (op == STI) {
			this.applyOp(op,a,b);
    } else if (op == ADX){
      this.applyOp(op,a,b);
    } else if (op == SBX){
      this.applyOp(op,a,b);
		} else {
			throw new Error('op: Unknown op... ('+op+')');
		}
		
		cost += valuesCost[a];
		cost += valuesCost[b];
		
		return cost;
	},
	nonBasicOp: function(op, arg){
		var val = this.fetch(arg);
    switch (op){
			case JSR:
			  this.write(--this.SP, this.PC);
				this.PC = val;
				break;
			case HCF:
			  console.error("halted and caught fire!", val);
				break;
			case INT:
			  console.warn("Software interrupt", val);
				// not even sure what to do here.
				break;
			case IAG:
			  this.storeTo(arg, this.IA);
				break;
			case IAS:
			  this.IA = val;
        break;
			case HWN:
        console.warn("HWN not implemented");
        break;
			case HWQ:
        console.warn("HWQ not implemented");
        break;
			case HWI:
        console.warn("HWI not implemented");
        break;
		}
		return ops2Cost[op] + valuesCost[arg];
	},
	/**
	 * Return the value associated with given value
	 * 
	 * @param {number} reg
	 * @param {boolean} isa this is the "a" operand (matters for push/pop)
	 */
	fetch: function(reg, isa){
		switch (reg) {
			case A: return this.A;
			case B: return this.B;
			case C: return this.C;
			case X: return this.X;
			case Y: return this.Y;
			case Z: return this.Z
			case I: return this.I;
			case J: return this.J;

      case readA: return this.read(this.A);
      case readB: return this.read(this.B);
      case readC: return this.read(this.C);
      case readX: return this.read(this.X);
      case readY: return this.read(this.Y);
      case readZ: return this.read(this.Z);
      case readI: return this.read(this.I);
      case readJ: return this.read(this.J);

      case readPCA: return this.read(this.read(this.PC++)+this.A);
      case readPCB: return this.read(this.read(this.PC++)+this.B);
      case readPCC: return this.read(this.read(this.PC++)+this.C);
      case readPCX: return this.read(this.read(this.PC++)+this.X);
      case readPCY: return this.read(this.read(this.PC++)+this.Y);
      case readPCZ: return this.read(this.read(this.PC++)+this.Z);
      case readPCI: return this.read(this.read(this.PC++)+this.I);
      case readPCJ: return this.read(this.read(this.PC++)+this.J);

      case PUSH: case POP: // same value
        if (isa) return this.read(this.SP++); // POP
        return this.read(--this.SP);
      case PEEK: return this.read(this.SP);
			case PICK: return this.read(this.read(this.PC++)+this.SP);

			case SP: return this.SP;
			case PC: return this.PC;
			case EX: return this.EX;

      case READNEXTWORD: return this.read(this.read(this.PC++));
      case NEXTWORD: return this.read(this.PC++);

			default:
//			console.log("defaulted",reg)
			  if (reg >= 0x20 && reg <= 0x3f) return ((reg-0x21) >>> 0) & 0xffff; // -1 ~ 30, but unsigned

        throw "Unknown value type: "+reg;
		}
	},

	/**
	 * apply function to va and vb, assign the result to b
   * determine if a is a register (ABCXYZIJ, PC, SP, EX), if so, assign it back to that
   * otherwise assign it to the RAM at a
	 * 
	 * @param {Object} op
	 * @param {Object} a
	 * @param {Object} b
	 * @param {Object} pcA
	 * @param {Object} va
	 * @param {Object} vb
	 */
  applyAt: function(op, va, vb, b, pcA){
    var result = this.lastStore = this.applyOp(op, va, vb);
		this.storeTo(result, b, pcA);
		
		return opsCost[op];
	},
	storeTo: function(value, target, pcA){
    switch (target) {
      case A: return this.A = value;
      case B: return this.B = value;
      case C: return this.C = value;
      case X: return this.X = value;
      case Y: return this.Y = value;
      case Z: return this.Z = value;
      case I: return this.I = value;
      case J: return this.J = value;

      case readA: return this.write(this.A, value);
      case readB: return this.write(this.B, value);
      case readC: return this.write(this.C, value);
      case readX: return this.write(this.X, value);
      case readY: return this.write(this.Y, value);
      case readZ: return this.write(this.Z, value);
      case readI: return this.write(this.I, value);
      case readJ: return this.write(this.J, value);

      case readPCA: return this.write(this.read(pcA)+this.A, value);
      case readPCB: return this.write(this.read(pcA)+this.B, value);
      case readPCC: return this.write(this.read(pcA)+this.C, value);
      case readPCX: return this.write(this.read(pcA)+this.X, value);
      case readPCY: return this.write(this.read(pcA)+this.Y, value);
      case readPCZ: return this.write(this.read(pcA)+this.Z, value);
      case readPCI: return this.write(this.read(pcA)+this.I, value);
      case readPCJ: return this.write(this.read(pcA)+this.J, value);

      case PUSH: return this.write(this.SP, value);// always a push, never a pop in slot b
      case PEEK: return this.write(this.SP, value);
      case PICK: return this.write(this.read(pcA)+this.SP, value);

      case SP: return this.SP = value;
      case PC: return this.PC = value;
      case EX: return this.EX = value;

      case READNEXTWORD: return this.write(this.read(pcA), value);
      case NEXTWORD: return console.warn("writing to NEXTWORD... ignored."); // ignored

      default:
			  // you cant put literals in slot b
        throw "Unknown value type: "+reg;
    }
	},

  applyIf: function(op, a, b){
		var ok = this.applyOp(op, a, b);
		// keep skipping ops as long as you skipped an if.
		// skip one additional op after the first non-if.
		// each skip costs an extra cycle
		var cost = 2; // right now, all the IF* ops cost 2 cycles
		if (!ok) while (this.skipNext()) ++cost;
		
		return cost;
	},

  applyOp: function(op,a,b){
		switch (op) {
	    case SET: return a;
	    case ADD:
			  this.EX = (a+b>0xffff) ? 1 : 0;
			  return a+b;
	    case SUB:
			  this.EX = (b-a<0) ? 0xffff : 0;
        return b-a;
      case MUL:
        this.EX = ((b*a)>>16)&0xffff;
        return (a*b)&0xffff;
      case MLI:
        if (a&0x8000) a = -(a-0x8000);
        if (b&0x8000) b = -(b-0x8000);
        this.EX = ((b*a)>>16)&0xffff;
        return (a*b)&0xffff;
      case DIV:
        this.EX = ((b<<16)/a)&0xffff;
        return Math.round((a/b)+0.5); // towards zero
      case DVI:
        if (a&0x8000) a = -(a-0x8000);
        if (b&0x8000) b = -(b-0x8000);
        this.EX = ((b<<16)/a)&0xffff;
        return Math.round((a/b)+0.5); // towards zero
      case MOD:
        if (!a) return 0;
        return b%a;
      case MDI:
        if (a&0x8000) a = -(a-0x8000);
        if (b&0x8000) b = -(b-0x8000);
        if (!a) return 0;
        return b%a;
			case AND:
			  return b&a;
			case BOR:
			  return b|a;
		  case XOR:
			  return b^a;
			case SHR:
			  this.EX = ((b<<16)>>a)&0xffff;
				return b>>>a;
			case ASR:
			  this.EX = ex=((b<<16)>>>a)&0xffff;
				return b>>a;
			case SHL:
			  this.EX = ((b<<a)>>16)&0xffff;
				return b<<a;

      case IFB: return b&a;
      case IFC: return !(b&a);
      case IFE: return b==a;
      case IFN: return b!=a;
      case IFG: return b>a;
      case IFA:
        if (a&0x8000) a = -(a-0x8000);
        if (b&0x8000) b = -(b-0x8000);
        return b>a;
      case IFL: return b<a;
      case IFU:
        if (a&0x8000) a = -(a-0x8000);
        if (b&0x8000) b = -(b-0x8000);
        return b<a;

			case ADX:
			  var v = a+b+this.EX;
				this.EX = (v>0xffff) ? 1 : 0;
				return v;
			case SBX:
			  var v = (a-b)+this.EX;
				this.EX = (v<0) ? 0xffff : 0;
				return v;

      case STI:
        ++this.I;
        ++this.J;
        return a;
      case STD:
        --this.I;
        --this.J;
        return a;
			
			case BRK: return this.stop();
			case LOG: return console.log('DCPU LOG:', a);
				

			default:
			  throw 'applyOp: Unknown op code... ('+op+')';
		}
	},

	skipNext: function(){
		var word = this.read(this.PC++);
    var op = word & 0xf; // first four bits
    var b = (word & 0x3f0) >> 4; // six bits
    var a = (word & 0xfc00) >> 10; // six bits

    // in all fairness, i dont like to do this.
    // but the alternative would be very explicit.
    if (op) {
      this.fetch(a);
			this.fetch(b);
		} else if (b) {
			this.fetch(a);
		} else {
      throw 'Unknown error'; // not possible?
    }
		
		return conditionals.indexOf(op) >= 0; // was this an if?
	},

  push: function(v){
    return this.store(--this.SP);
  },
  pop: function(){
    return this.fetch(this.SP--);
  },

  /**
   * Request an interrupt to be fired. The interrupt origin may be
   * software or hardware. The interrupt is put on a queue (always)
   * and is triggered if it is the first element after the current
   * instruction finishes. But only if IA is not 0.
   * 
   * @param {Object} interrupt
   */
  fireInterrupt: function(interrupt){
		this.interruptsToFire.push(interrupt);
	},
	nextInterrupt: function(){
    // "If IA is set to 0, a triggered interrupt does nothing. Software interrupts still take up four clock cycles, but immediately return, incoming hardware interrupts are ignored."
		var i = this.interruptsToFire.shift();
		// if 0, do stuff
		if (this.IA) {
			this.push(this.PC);
			this.push(this.A);
			this.PC = this.IA;
			this.A = i.msg;
		}
		if (i.origin == 'soft') this.cycles += 4;
	},
};

return Dcpu;
})();
