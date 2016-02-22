﻿'use strict';

var nj = require('../core'),
    tools = require('./tools');

//过滤器对象
nj.filters = {
    //Get parameter properties
    prop: function (obj, props) {
        var ret = obj;
        tools.each(props.split("."), function (prop) {
            ret = ret[prop];
        });

        return ret;
    },

    //Get list count
    count: function (obj) {
        return obj ? obj.length : 0;
    },

    //Get list item
    item: function (obj, no) {
        return obj ? obj[no] : null;
    }
};

//注册过滤器
function registerFilter(name, filter) {
    var params = name;
    if (!tools.isArray(name)) {
        params = [{ name: name, filter: filter }];
    }

    tools.each(params, function (param) {
        nj.filters[param.name.toLowerCase()] = param.filter;
    });
}

var filter = {
    registerFilter: registerFilter
};

module.exports = filter;