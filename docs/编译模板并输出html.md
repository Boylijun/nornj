# 编译模板并输出html

每个NornJ模板都可以编译为1个模板函数。传入数据并执行此模板函数则可以输出html字符串，这样就可以配合Backbone.js等mvc框架作为视图的模板引擎了。

### 将模板编译为模板函数

举例：
```js
//定义模板
var tmpl =
['div id=test1',
    'this the test demo{no}.'
    ['<i>', 'test{no}'],
'/div'];

//编译为模板函数
var tmplFn = nj.compile(tmpl, 'tmpl1');
```

1. 编译模板函数须使用nj.compile方法。该方法第一个参数为NornJ模板对象；
2. 第二个参数为模板名称，该参数是可选的。如果设置了模板名称(模板名称应为全局唯一)，则下一次编译名称相同的模板时会直接从缓存中获取，这样就会提升很多性能。通常情况下推荐编译时设置该名称参数。

### 执行模板函数并输出html

举例：
```js
//定义模板
var tmpl =
['div id=test1',
    'this the test demo{no}.'
    ['<i>', 'test{no}'],
'/div'];

//编译为模板函数
var tmplFn = nj.compile(tmpl, 'tmpl1');

//输出html
var html = tmplFn({
    no: 100
});

console.log(html);
/*输出html:
<div id="test1">
    this the test demo100.
    <i>test100</i>
</div>
*/
```

1. 模板函数只有一个参数，值为json格式的数据。模板中和传入数据中对应的值会自动进行相应替换，最后输出结果为替换后的html字符串。
2. 模板函数的参数也可以传入1个任意长度的数组，如下所示：
```js
//定义模板
var tmpl =
['div id=test1',
    'this the test demo{no}.'
    ['<i>', 'test{no2}'],
'/div'];

//编译为模板函数
var tmplFn = nj.compile(tmpl, 'tmpl1');

//输出html
var html = tmplFn([{
    no: 100
}, {
    no: 200,
    no2: 300
}]);

console.log(html);
/*输出html:
<div id="test1">
    this the test demo100.
    <i>test300</i>
</div>
```
以数组形式传入多个参数后，NornJ模板在编译时会按顺序检测每个数据对象是否有和模板中对应的值。如果检测到前面的参数有对应值，那么就会停止继续检测后面的参数是否有该对应值
