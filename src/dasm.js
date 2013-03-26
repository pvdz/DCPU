var Dasm = function(asm){
	this.asm = asm;
};
Dasm.prototype = {
	values: new function(){ return {
	  A:0x00,
	  B:0x01,
	  C:0x02,
	  X:0x03,
	  Y:0x04,
	  Z:0x05,
	  I:0x06,
	  J:0x07,
	  '[A]':0x08,
	  '[B]':0x09,
	  '[C]':0x0a,
	  '[X]':0x0b,
	  '[Y]':0x0c,
	  '[Z]':0x0d,
	  '[I]':0x0e,
	  '[J]':0x0f,
	  '[[PC++]+A]': 0x10,
	  '[[PC++]+B]': 0x11,
	  '[[PC++]+C]': 0x12,
	  '[[PC++]+X]': 0x13,
	  '[[PC++]+Y]': 0x14,
	  '[[PC++]+Z]': 0x15,
	  '[[PC++]+I]': 0x16,
	  '[[PC++]+J]': 0x17,
	  POP: 0x18,
    PUSH:0x18,
    PEEK:0x19,
    PICK:0x1a,
	  SP:  0x1b,
	  PC:  0x1c,
	  EX:  0x1d,
	  '[[PC++]]':0x1e,
	  '[PC++]': 0x1f,
	}},
  valueCost: [0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x1a, 0x1e, 0x1f],
	ops: new function(){ return {
		// bops
	  SET: 0x01,
	  ADD: 0x02,
	  SUB: 0x03,
	  MUL: 0x04,
		MLI: 0x05,
	  DIV: 0x06,
		DVI: 0x07,
	  MOD: 0x08,
		MDI: 0x09,
	  AND: 0x0a,
	  BOR: 0x0b,
	  XOR: 0x0c,
    SHR: 0x0d,
    ASR: 0x0e,
    SHL: 0x0f,
	  IFB: 0x10,
	  IFC: 0x11,
	  IFE: 0x12,
    IFN: 0x13,
    IFG: 0x14,
    IFA: 0x15,
    IFL: 0x16,
    IFU: 0x17,
    ADX: 0x1a,
    SBX: 0x1b,
    STI: 0x1e,
    STD: 0x1f,
    // uops
	  JSR: 0x01,
		BRK: 0x02, // custom
		LOG: 0x03, // custom
		HCF: 0x07,
		INT: 0x08,
		IAG: 0x09,
		IAS: 0x0a,
		IAP: 0x0b,
		HWN: 0x10,
		HWQ: 0x11,
		HWI: 0x12,
	}},
	bopsCost: [0,1,2,2,2,2,3,3,3,3,1,1,1,2,2,2,2/3,2/3,2/3,2/3,2/3,2/3,2/3,2/3,0,0,3,3,0,0,2,2],
	uopsCost: [0,3,0,0,0,0,0,9,4,1,1,3,2,0,0,0,2,4,4/5],
	
	// yep, most of the syntax is parsed through one huge regex
	//             label(s)                  DAT                                          <hex    |dec>   or -> opcode                         lhs__a(     hex     | dec  | label/reg | [ (optional:hex  | dec  | label/reg +)        +                  hex    | dec | label/reg   ])   optional(,                rhs__b(  hex     | dec  | label/reg   [ (optional: hex    | dec  | label/reg          +)                  hex     | dec  | label/reg   ]))             ; optional comment <end>
	rex: /^[^\S\n]*((?:\:[a-z_0-9]+[^\S\n]*)*)*(?:(DAT(?:[^\S\n]*(?:[^\S\n]|,)[^\S\n]*(?:(?:0x[\da-f]+)|\d+))+)|(?:([a-z]{3})[^\S\n]*(?:[^\S\n]|,)[^\S\n]*(((0x[\da-f]+)|(\d+))|([a-z_\d]+)|(\[((?:((0x[\da-f]+)|(\d+))|([a-z_\d]+))[^\S\n]*\+[^\S\n]*)?(((0x[\da-f]+)|(\d+))|([a-z_\d]+))\])))[^\S\n]*(?:(?:[^\S\n]|,)[^\S\n]*(((0x[\da-f]+)|(\d+))|([a-z_\d]+)|(\[((?:((0x[\da-f]+)|(\d+))|([a-z_\d]+))[^\S\n]*\+[^\S\n]*)?(((0x[\da-f]+)|(\d+))|([a-z_\d]+))\])))?)?[^\S\n]*(;.*)?(?:\n|$)/igm,
	// result indices
	LABELS: 1,
	DAT: 2,
	OPCODE: 3,
	A: 4,
	B: 20,
	ab: { // A+... or B+...
		LIT: 1,
		HEX: 2,
		DEC: 3,
		NAME: 4,
		BOX: 5,
		LHS: 6,
		LHSLIT: 7,
		LHSHEX: 8,
		LHSDEC: 9,
		LHSNAME: 10,
		RHS: 11,
		RHSLIT: 12,
		RHSHEX: 13,
		RHSDEC: 14,
		RHSNAME: 15,
	},
	COMMENT: 36,

	labels: null,
	html: null,
	mcode: null,
	ruler: null,
	lastOpIf: false,

	lpad: function(s, len, chr){
		while (s.length < len) s = chr+s;
		return s;
	},
	limit: 0,
	limit2: 0,
	parse: function(){
		this.rex.lastIndex = 0;
		this.html = [];
		this.mcode = [];
		this.labels = {};
		this.ruler = [];
		this.costs = [];
		this.bytes = [];
		
    this._parse();
		
		// can only do this after to resolve forward labels
		this.resolveLabels();
		// the machine code depends on labels, so do this after resolving them
		this.generateMachineCode();
		
		return this;
	},
	_parse: function(){
    for (;;) {
      if (this.limit++ > 10000) throw 'oopsie';
      var last = this.parseLine(this.rex.lastIndex);
      var nl = this.asm.indexOf('\n', last);
      if (nl < 0) {
        if (last != this.asm.length) this.addFailedLine(this.asm.substring(last));
        break;
      }
//    console.warn('Unable to parse: "'+this.asm.substring(last, nl).replace(/\n/g,'\u23CE')+'"',last,'~',nl);
      if (last != this.asm.length) {
        this.addFailedLine(this.asm.substring(last, nl));
        this.rex.lastIndex = nl+1;
      }
    } while (nl >= 0);
	},
	resolveLabels: function(){
    this.mcode.forEach(function(f,i){
      if (typeof f == 'function') this.mcode[i] = f(this.labels);
    },this);
	},
	generateMachineCode: function(){
    this.bytes = this.bytes.map(function(o){
      if (!o) return '';
      return this.mcode.slice(o.start, o.stop).map(function(n){ return this.convertNumberToWord(n); },this).join(' ');
    },this);
	},
	addFailedLine: function(content){
    this.ruler.push('');
    this.costs.push('');
    this.bytes.push('');
    this.html.push('<div><span class="no">'+content+'&zwnj;</span></div>'); // the zwnj makes sure empty lines dont collapse... thanks html.
	},
	parseLine: function(){
		for (;;) {
			if (this.limit2++ > 10000) throw 'oopsie2';
			
			var start = this.rex.lastIndex;
			var match = this.rex.exec(this.asm);
			
			if (!(match && match[0] && match.index == start)) break; 
			if (!this.line(match)) break;
			//      console.log("Parsed:", match, start, '~',this.rex.lastIndex);
		}
		
		return start;
	},
	line: function(match){
		var start = this.mcode.length;
		var code = this.clean(match);
		if (!code) return false; // only comment, empty line, etc

    var op = match[this.OPCODE];
		if (op) op = op.toUpperCase();
		if (op && typeof this.ops[op] != 'number') return false; // unknown op

		this.registerLabels(match, start);

	  if (match[this.DAT]) {
			var arr = match[this.DAT].split(/[\s,]+/).slice(1);
			arr = arr.map(function(n){
				if (n[1] == 'x' || n[1] == 'X') return parseInt(n, 16);
				return parseInt(n, 10);
			});
	    this.mcode.push.apply(this.mcode, arr);
			this.costs.push('');
		} else if (op) {
			var word = this.compile(match);
			if (word === false) return false;
			this.costs.push(this.getCost(word));
			this.lastOpIf = (op[0] == 'I' && op[1] == 'F');
		} else {
      this.costs.push('');
		}

    this.ruler.push('0x'+this.convertNumberToWord(start));
	  this.bytes.push({start:start, stop:this.mcode.length});
		var id = '';
		if (match[this.OPCODE]) id = ' id="addr_'+start+'"';
  	this.html.push('<div'+id+'><span class="yes">'+(match[0][match[0].length-1]=='\n'?match[0].slice(0,-1):match[0])+'</span></div>');
	  return true;
  },
	getCost: function(word){
		var op = word & 0xf; // first four bits
		var a = (word & 0x3f0) >> 4; // six bits
		var b = (word & 0xfc00) >> 10; // six bits
		var cost = this.computeCost(op, a, b);
		if (cost%1) return Math.floor(cost)+'?';
		return Math.floor(cost);
	},
	computeCost: function(op, a, b,c){
		if (op) return this.bopsCost[op]+(this.valueCost.indexOf(a)>=0)+(this.valueCost.indexOf(b)>=0);
		return this.uopsCost[a]+(this.valueCost.indexOf(b)>=0);
	},
	clean: function(match){
		var s = '';
		if (match[this.LABELS]) s += match[this.LABELS];
		// todo: clean up box as well
		var opc = match[this.OPCODE];
		if (opc) opc = opc.toUpperCase();
		
		if (['JSR', 'BRK', 'LOG', 'HCF', 'INT', 'IAG', 'IAS', 'IAP', 'HWN', 'HWQ', 'HWI'].indexOf(opc) >= 0) {
			s += this.lpad('',14+(this.lastOpIf?4:0)-s.length,' ')+' '+match[this.OPCODE]+' '+match[this.A];
		} else if (opc) {
			s += this.lpad('',14+(this.lastOpIf?4:0)-s.length,' ')+' '+match[this.OPCODE]+' '+match[this.A]+', '+match[this.B];
		} else if (match[this.DAT]) {
			var arr = match[this.DAT].split(/\s+/);
			s += this.lpad('',15+(this.lastOpIf?4:0)-s.length,' ');
			s += 'DAT';
			s += arr.map(function(n,i){
				if (i) return n;
				return '';
			}).join(' ');
		}
		return s;
	},
	registerLabels: function(match, start){
		if (match[this.LABELS]) {
			match[this.LABELS].split(/\s+/).forEach(function(label){
			  if (label) this.labels[label.substring(label.indexOf(':')+1)] = start;
			},this);
		}
	},
	compile: function(match){
		var bc = [];

    var opc = match[this.OPCODE].toUpperCase();
		var op = this.ops[opc];
		if (op == null) throw 'Why parsing a non-existing op?';
		
		var a = this.getValue(this.A, match, bc);
		if (a === false) return false;
		// asm
		// "non-basic ops"
		if (opc == 'JSR' || opc == 'BRK' || opc == 'LOG') {
//			console.log("for jsr");
			var b = a;
			a = op;
			op = 0;
		} else if (op) { // basic ops
//		console.log("For none jsr", op)
			var b = this.getValue(this.B, match, bc);
			if (b === false) return false;
		} else {
			throw 'Dasm found an unsupported (non-basic) opcode... new spec? custom extension? ['+match[this.OPCODE]+']';
		}

		var word = (b<<10)+(a<<5)+op;
		bc.unshift(word);
		this.mcode.push.apply(this.mcode, bc);
		
		return word;
	},
	getValue: function(ab, match, args){
		var arg = match[ab];
		var lit = match[ab+this.ab.LIT];
		var name = match[ab+this.ab.NAME];
		var lhs = match[ab+this.ab.LHS];
		var rhs = match[ab+this.ab.RHS];
		var rhsname = match[ab+this.ab.RHSNAME];
		var rhslit = match[ab+this.ab.RHSLIT];
		
		var ret = null;
		if (name) {
			if (/^(?:[ABCXYZIJ]|PC|SP|EX|PEEK|PUSH|POP|PICK)$/i.test(name)) {
				name = name.toUpperCase();
				if (ab == this.A && name == 'POP') return false; // only allowed in a
				if (ab == this.B && name == 'PUSH') return false; // only allowed in b
				
				// name is an actual reg. we can look them up
				ret = this.values[name];
			} else {
				// name must be a label, resolve those later
				args.push(function(labels){ return labels[name]; });
				ret = this.values['[PC++]'];
			}
		} else if (lit) {
			var val = this.parseNumber(match[ab+this.ab.HEX], match[ab+this.ab.DEC]);

			// compile small numbers inline, but larger nums as literals
			if (val >= 0x1f) {
				args.push(val);
				ret = this.values['[PC++]']; // next word
			} else { // small
				ret = val + 0x1f;
			}
		} else if (lhs) {
			// [lhs+rhs]
			// lhs should be a number (nextword or label)
			// rhs should be one of the 8 basic registers (ABCXYZIJ)
			// (or other way around...)
      var lhshex = match[ab+this.ab.LHSHEX];
      var lhsdec = match[ab+this.ab.LHSDEC];
      var lhsname = match[ab+this.ab.LHSNAME];
      var rhshex = match[ab+this.ab.RHSHEX];
      var rhsdec = match[ab+this.ab.RHSDEC];
      var rhsname = match[ab+this.ab.RHSNAME];
			
			var lr = (lhshex || lhsdec || lhsname) && /^(?:[ABCXYZIJ])$/i.test(rhsname);
			var rl = (rhshex || rhsdec || rhsname) && /^(?:[ABCXYZIJ])$/i.test(lhsname);

			if (!lr && !rl) return console.error('BOX should have one number/label + one of the eight registers', match), false;
			if (lr && rl) return false; // [x+i]

			// push the number arg for this op
			if (lr) {
	      if (lhshex || lhsdec) args.push(lhshex, lhsdec);
	      else args.push(function(labels){ return labels[lhsname]; });
        ret = this.values['[[PC++]+'+rhsname.toUpperCase()+']'];
			} else {
	      if (rhshex || rhsdec) args.push(rhshex, rhsdec);
	      else args.push(function(labels){ return labels[rhsname]; });
        ret = this.values['[[PC++]+'+lhsname.toUpperCase()+']'];
			}
		} else if (rhsname) {
			// [rhs] where rhs is a string
			// rhs can be a register or known constant (ABC PUSH POP etc)
			// otherwise it's a label
			
			if (/^(?:[ABCXYZIJ])$/i.test(rhsname)) {
				ret = this.values['['+rhsname.toUpperCase()+']'];
			} else {
				// a must be a label. cannot be a number and PC SP PUSH POP PEEK O arent defined to be allowed
				// actually not sure whether this makes sense, or should even be allowed, but whatever
				args.push(function(labels){ return labels[rhsname]; });
				ret = this.values['[[PC++]]'];
			}
		} else if (rhslit) {
			var rhshex = match[ab+this.ab.RHSHEX];
			var rhsdec = match[ab+this.ab.RHSDEC];
			// cant use short-literal notation, no op defined for it
			args.push(this.parseNumber(rhshex, rhsdec));
			ret = this.values['[[PC++]]']; // [[PC++]] => [lit]
		} else {
			return false;
		}
		return ret;
	},
	parseNumber: function(hex, dec){
		// get real value
		if (hex) return parseInt(hex, 16);
		return parseInt(dec, 10);
	},
	convertNumberToWord: function(n){
		return this.lpad((n||'').toString(16), 4, '0');
	},
};