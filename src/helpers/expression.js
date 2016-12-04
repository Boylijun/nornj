﻿'use strict';

var tools = require('../utils/tools');

//Global expression list
var exprs = {
  'if': function (refer, useUnless) {
    if (refer === 'false') {
      refer = false;
    }

    var referR, ret;
    if (!useUnless) {
      referR = !!refer;
    }
    else {
      referR = !!!refer;
    }
    if (referR) {
      ret = this.result();
    }
    else {
      ret = this.inverse();
    }

    if (this.useString && ret == null) {
      return '';
    }

    return ret;
  },

  unless: function (refer) {
    return exprs['if'].call(this, refer, true);
  },

  each: function (refer) {
    var thiz = this,
      useString = thiz.useString,
      ret;

    if (refer) {
      if (useString) {
        ret = '';
      }
      else {
        ret = [];
      }

      tools.each(refer, function (item, index) {
        var retI = thiz.result({
          item: item,
          index: index,
          fallback: true
        });

        if (useString) {
          ret += retI;
        }
        else {
          ret.push(retI);
        }
      }, false, tools.isArrayLike(refer));

      //Return null when not use string and result is empty.
      if (!useString && !ret.length) {
        ret = null;
      }
    }
    else {
      ret = thiz.inverse();
      if (useString && ret == null) {
        ret = '';
      }
    }

    return ret;
  },

  //Parameter
  param: function () {
    var ret = this.result(),  //Get parameter value
      name = '',
      value;

    //Make property name by multiple parameters
    tools.each(arguments, function (item, i) {
      name += item;
    }, false, true);

    //If the value length greater than 1, it need to be connected to a whole string.
    if (ret != null) {
      if (!tools.isArray(ret)) {
        value = ret;
      }
      else {
        value = '';
        tools.each(tools.flatten(ret), function (item) {
          value += item != null ? item : '';
        }, false, true);
      }
    }
    else {  //Match to Similar to "checked" or "disabled" attribute.
      value = !this.useString ? true : name;
    }

    this.paramsExpr[name] = value;
  },

  //Spread parameters
  spreadparam: function (refer) {
    if (!refer) {
      return;
    }

    var thiz = this;
    tools.each(refer, function (v, k) {
      thiz.paramsExpr[k] = v;
    }, false, false);
  },

  equal: function (value1, value2) {
    var ret;
    if (value1 == value2) {
      ret = this.result();
    }
    else {
      ret = this.inverse();
    }

    return ret;
  },

  'for': function (start, end) {
    var ret, useString = this.useString;
    if (useString) {
      ret = '';
    }
    else {
      ret = [];
    }

    if (end == null) {
      end = start;
      start = 0;
    }
    start = parseInt(start, 10);
    end = parseInt(end, 10);

    for (; start <= end; start++) {
      var retI = this.result({
        index: start
      });

      if (useString) {
        ret += retI;
      }
      else {
        ret.push(retI);
      }
    }

    return ret;
  },

  blank: function () {
    return this.result();
  }
};

function _commonConfig(params) {
  var ret = {
    data: true,
    parent: true,
    index: true,
    useString: true,
    paramsExpr: false,
    result: true,
    inverse: true,
    newContext: false
  };

  if (params) {
    ret = tools.assign(ret, params);
  }
  return ret;
}

//Expression default config
var _defaultConfig = { data: false, parent: false, index: false },
  exprConfig = {
    'if': _commonConfig(_defaultConfig),
    unless: _commonConfig(_defaultConfig),
    each: _commonConfig(tools.assign({ newContext: true }, _defaultConfig)),
    param: _commonConfig(tools.assign({ inverse: false, paramsExpr: true }, _defaultConfig)),
    spreadparam: _commonConfig(tools.assign({ useString: false, result: false, inverse: false, paramsExpr: true }, _defaultConfig)),
    equal: _commonConfig(tools.assign({ useString: false }, _defaultConfig)),
    'for': _commonConfig(tools.assign({ newContext: true }, _defaultConfig, { data: true })),
    blank: _commonConfig(tools.assign({ useString: false, inverse: false }, _defaultConfig))
  };

//Expression alias
exprs.prop = exprs.p = exprs.param;
exprConfig.prop = exprConfig.p = exprConfig.param;
exprs.spread = exprs.spreadparam;
exprConfig.spread = exprConfig.spreadparam;

//Register expression and also can batch add
function registerExpr(name, expr, options) {
  var params = name;
  if (!tools.isObject(name)) {
    params = {};
    params[name] = {
      expr: expr,
      options: options
    };
  }

  tools.each(params, function (v, k) {
    var name = k.toLowerCase();
    if (v) {
      var expr = v.expr,
        options = v.options;

      if (expr || options) {
        if(expr) {
          exprs[name] = expr;
        }
        if(options) {
          exprConfig[name] = _commonConfig(options);
        }
      }
      else {
        exprs[name] = v;
      }
    }
  }, false, false);
}

module.exports = {
  exprs: exprs,
  exprConfig: exprConfig,
  registerExpr: registerExpr
};