﻿'use strict';

var tools = require('../utils/tools');

//Global expression list
var exprs = {
  'if': function(value, options) {
    if (value === 'false') {
      value = false;
    }

    var valueR, ret;
    if (!options.useUnless) {
      valueR = !!value;
    } else {
      valueR = !!!value;
    }
    if (valueR) {
      ret = options.result();
    } else {
      let props = options.props;
      if(props && props['else']) {
        ret = props['else']();
      }
    }

    if (options.useString && ret == null) {
      return '';
    }

    return ret;
  },

  'else': function(options) {
    options.exprProps['else'] = () => options.result();
  },

  unless: function(value, options) {
    options.useUnless = true;
    return exprs['if'].call(this, value, options);
  },

  each: function(list, options) {
    var useString = options.useString,
      ret;

    if (list) {
      if (useString) {
        ret = '';
      } else {
        ret = [];
      }

      const props = options.props;
      tools.each(list, function(item, index) {
        let param = {
          data: item,
          index: index,
          fallback: true
        };

        if (props && props.extra) {
          param.extra = {
            isFirst: index === 0,
            isLast: index === list.length - 1
          };
        }

        let retI = options.result(param);
        if (useString) {
          ret += retI;
        } else {
          ret.push(retI);
        }
      }, false, tools.isArrayLike(list));

      //Return null when not use string and result is empty.
      if (!useString && !ret.length) {
        ret = null;
      }
    } else {
      let props = options.props;
      if(props && props['else']) {
        ret = props['else']();
      }
      if (useString && ret == null) {
        ret = '';
      }
    }

    return ret;
  },

  //Parameter
  param: function(name, options) {
    var ret = options.result(), //Get parameter value
      value;

    //If the value length greater than 1, it need to be connected to a whole string.
    if (ret != null) {
      if (!tools.isArray(ret)) {
        value = ret;
      } else {
        value = '';
        tools.each(tools.flatten(ret), function(item) {
          value += item != null ? item : '';
        }, false, true);
      }
    } else { //Match to Similar to "checked" or "disabled" attribute.
      value = !options.useString ? true : name;
    }

    options.exprProps[name] = value;
  },

  //Spread parameters
  spread: function(refer, options) {
    if (!refer) {
      return;
    }

    tools.each(refer, function(v, k) {
      options.exprProps[k] = v;
    }, false, false);
  },

  'for': function(start, end, options) {
    var ret, useString = options.useString;
    if (useString) {
      ret = '';
    } else {
      ret = [];
    }

    if (end == null) {
      end = start;
      start = 0;
    }
    start = parseInt(start, 10);
    end = parseInt(end, 10);

    for (; start <= end; start++) {
      var retI = options.result({
        index: start
      });

      if (useString) {
        ret += retI;
      } else {
        ret.push(retI);
      }
    }

    return ret;
  },

  blank: function(options) {
    return options.result();
  }
};

function _commonConfig(params) {
  var ret = {
    useString: true,
    exprProps: false,
    newContext: true
  };

  if (params) {
    ret = tools.assign(ret, params);
  }
  return ret;
}

//Expression default config
var exprConfig = {
  'if': _commonConfig({ newContext: false }),
  'else': _commonConfig({ newContext: false, useString: false, exprProps: true }),
  unless: _commonConfig({ newContext: false }),
  each: _commonConfig(),
  param: _commonConfig({ newContext: false, exprProps: true }),
  spread: _commonConfig({ newContext: false, useString: false, exprProps: true }),
  equal: _commonConfig({ newContext: false, useString: false }),
  'for': _commonConfig(),
  blank: _commonConfig({ newContext: false, useString: false })
};

//Expression alias
exprs.prop = exprs.p = exprs.param;
exprConfig.prop = exprConfig.p = exprConfig.param;

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

  tools.each(params, function(v, name) {
    if (v) {
      var expr = v.expr,
        options = v.options;

      if (expr || options) {
        if (expr) {
          exprs[name] = expr;
        }
        if (options) {
          exprConfig[name] = _commonConfig(options);
        }
      } else {
        exprs[name] = v;
      }
    }
  }, false, false);
}

module.exports = {
  exprs,
  exprConfig,
  registerExpr
};