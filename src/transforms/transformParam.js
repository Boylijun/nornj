﻿import nj from '../core';
import * as tools from '../utils/tools';
const { tmplRule } = nj;

//Get compiled parameters from a object
export function compiledParams(obj) {
  let ret = tools.obj();
  tools.each(obj, function(v, k) {
    ret[k] = compiledParam(v);
  }, false, false);

  return ret;
}

//Get compiled property
const REGEX_JS_PROP = /(('[^']*')|("[^"]*")|(-?([0-9][0-9]*)(\.\d+)?)|true|false|null|undefined|([#]*)([^.[\]()]+))([^\s()]*)/;

export function compiledProp(prop) {
  let ret = tools.obj();

  //If there are colons in the property,then use filter
  if (prop.indexOf('|') >= 0) {
    let filters = [],
      filtersTmp;
    filtersTmp = prop.split('|');
    prop = filtersTmp[0].trim(); //Extract property

    filtersTmp = filtersTmp.slice(1);
    tools.each(filtersTmp, (filter) => {
      let retF = _getFilterParam(filter.trim()),
        filterObj = tools.obj(),
        filterName = retF[1]; //Get filter name

      if (filterName) {
        const paramsF = retF[3]; //Get filter param

        //Multiple params are separated by commas.
        if (paramsF) {
          let params = [];
          tools.each(paramsF.split(','), (p) => {
            params[params.length] = compiledProp(p.trim());
          }, false, true);

          filterObj.params = params;
        }

        filterObj.name = filterName;
        filters.push(filterObj);
      }
    }, false, true);

    ret.filters = filters;
  }

  //Extract the parent data path
  if (prop.indexOf('../') === 0) {
    let n = 0;
    prop = prop.replace(/\.\.\//g, function() {
      n++;
      return '';
    });

    ret.parentNum = n;
  }

  //Extract the js property
  prop = REGEX_JS_PROP.exec(prop);
  const hasComputed = prop[7];
  ret.name = hasComputed ? prop[8] : prop[1];
  ret.jsProp = prop[9];

  if (!prop[8]) { //Sign the parameter is a basic type value.
    ret.isBasicType = true;
  }
  if (hasComputed) {
    ret.isComputed = true;
  }

  return ret;
}

//Get filter param
const REGEX_FILTER_PARAM = /([^\s()]+)(\(([^()]+)\))*/;

function _getFilterParam(obj) {
  return REGEX_FILTER_PARAM.exec(obj);
}

//Extract replace parameters
const _quots = ['\'', '"'];

function _getReplaceParam(obj, strs) {
  let pattern = tmplRule.replaceParam,
    matchArr, ret, i = 0;

  while ((matchArr = pattern.exec(obj))) {
    if (!ret) {
      ret = [];
    }

    let prop = matchArr[3],
      item = [matchArr[0], matchArr[1], null, true];

    if (i > 0) {
      item[3] = false; //Sign not contain all of placehorder
    }

    //Clear parameter at both ends of the space.
    prop = prop.trim();

    item[2] = prop;
    ret.push(item);
    i++;
  }

  return ret;
}

//Get compiled parameter
export function compiledParam(value) {
  let ret = tools.obj(),
    strs = tools.isString(value) ? value.split(tmplRule.replaceSplit) : [value],
    props = null,
    isAll = false; //此处指替换符是否占满整个属性值;若无替换符时为false

  //If have placehorder
  if (strs.length > 1) {
    const params = _getReplaceParam(value, strs);
    props = [];

    tools.each(params, (param) => {
      let retP = tools.obj();
      isAll = param[3] ? param[0] === value : false; //If there are several curly braces in one property value, "isAll" must be false.
      retP.prop = compiledProp(param[2]);

      //To determine whether it is necessary to escape
      retP.escape = param[1] !== tmplRule.firstChar + tmplRule.startRule;
      props.push(retP);
    }, false, true);
  }

  ret.props = props;
  ret.strs = strs;
  ret.isAll = isAll;

  return ret;
}