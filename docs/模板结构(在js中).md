# 模板结构(在js中)

NornJ模板可以在js或html中构建，分别有不同的用途：
* [构建在js中的模板](#构建在js中的模板)
  * [在ES6环境下构建模板](#在es6环境下构建模板)
    * [模板嵌套](#模板嵌套)
    * [模板替换参数](#模板替换参数)
    * [过滤器](#过滤器)
    * [表达式块](#表达式块)
    * [内置表达式块](#内置表达式块)
  * [在ES5环境下构建模板](#在ES5环境下构建模板)
* [构建在html中的模板](https://github.com/joe-sky/nornj/blob/master/docs/模板结构(在html中).md)

### 构建在js中的模板
---

#### 在es6环境下构建模板
NornJ模板的结构与html非常相似，基本示例如下：
```js
import nj from nornj;

nj`   <!--模板字符串前须要加nj标签函数-->
<slider>
  this the test slider {msg}.
  <sliderItem id=test onsliderend={event} />
</slider>`
```

##### 模板嵌套
模板可以嵌套使用，语法即为es6模板字符串提供的"${}"占位符：
```js
let tmpl1 = nj`
<div>
  <slider />
</div>`

let tmpl2 = nj`
<section>
  ${tmpl1}
</section>`

//嵌套多个元素，可使用数组：
let tmpl3 = nj`
<span>
  <slider />
</span>`

let tmpl4 = nj`
<section>
  ${[tmpl2, tmpl3]}
</section>`

//数组也可以嵌套多层：
let tmpl5 = nj`
<section>
  ${[tmpl1, [tmpl2, tmpl3]]}
</section>`
```

##### 模板替换参数

在模板内可以定义替换参数，语法为"{参数名}"。替换参数的作用是在模板编译后，输出html字符串或组件时，可用数据替换定义好的参数。

* 在元素节点参数中定义替换参数

```js
nj'<div id={id} name={name}>'
```

* 在文本节点中定义替换参数

```js
nj`<div>{content}</div>`
```

* 使用1个花括号形式的参数，在生成html数据时是会自动进行字符转义的，这样的目的是为了防止xss攻击等。但是也可以设置不进行转义，就须要用两个花括号的形式定义替换参数，如下所示：

```js
nj`<div>{{content}}</div'>`
```

* 元素节点名称也可以设置为替换参数，如下所示：
```js
nj`<{element}>this is content</{element}>`
```
元素节点名称作为替换参数时，不支持使用2个花括号形式的字符转义，但是会自动进行转义。生成html字符串时，这样替换时则一定会执行转义；生成React组件时，这样替换则不会进行转义，因为React会替我们进行转义。

* 替换参数内可放入字符串：
```js
nj`<div>{'content'}</div>`
```
放入字符串语法为使用引号包裹，例中执行模板函数时会直接输出"content"。

* 替换参数内也可放入多个值：
```js
nj`<div>{content 'content'}</div>`

let data = {
  content: 'test'
};
```
替换参数内放入多个值后会对所有值进行连接输出，如例中执行模板函数时会输出："testcontent"。

##### 过滤器

* 在替换参数中可以定义过滤器，来对数据进行一些定制化操作。语法为"{替换参数:过滤器1:过滤器2...}"，如使用多个过滤器则会按顺序依次执行，如下所示：
```js
nj.registerFilter('format', obj => obj + 1);

nj`
<div>
  {list:count}        //获取总数
  {list:count:format} //先获取总数,然后格式化
</div>`
```

* 也可以一次定义多个过滤器：
```js
nj.registerFilter({
  format: obj => obj.trim(),
  replace: obj => obj.replace(/id/g, 'test1')
});
```

* 过滤器也可以添加参数，语法为"{替换参数:过滤器1(参数1,参数2...):过滤器2(参数1,参数2...)...}"。在过滤器方法中第一个参数是当前传入的数据；从第二个参数开始依次为这些模板中传入的参数，如下所示：
```js
nj.registerFilter('test', (obj, p1, p2) => {
  console.log(obj);  //输出test
  console.log(p1);   //输出1
  console.log(p2);   //输出2
  return obj;
});

nj.compile(nj`
<div>
  {data:test(1, 2)}
/div>
`)({ data: 'test'});
```

* 在过滤器方法内，可以通过this.x的方式获取一些参数，如下所示：
```js
nj.registerFilter('test', function(obj) {
  console.log(this.data);    //输出1
  console.log(this.parent.data);  //输出{ list: [1] }
  console.log(this.index);   //输出0
  return obj;
});

nj.compile(nj`
<#each {list}>
  {#:test}
</#each>
`)({ list: [1] });
```

* 如替换参数内有多个参数，则可为每个参数都设置各自的过滤器，如下所示：
```js
{test:filter1:filter2(1) 'test2':filter2 test3}
```

* 内置过滤器

| 名称           | 作用            | 示例                    |
|:---------------|:----------------|:------------------------|
| prop           | 获取对象属性值  | {content:prop(foo.bar)} |
| count          | 获取集合总数    | {content:count}         |
| item           | 获取集合项值    | {content:item(0)}       |
| equal          | 是否等于某个值  | {content:equal(foo)}    |

##### 表达式块

NornJ模板中可使用内置表达式块来进行if、unless、each等流程控制；也可以支持自定义表达式块。

* 表达式块语法

在模板中表达式块使用封闭的节点元素形式定义，节点名称为`#`+`表达式块名称`。在表达式块节点开始标签内可以定义一个替换参数，不用加属性名。格式例如：
```js
nj`
<#each {refer}>
  ...
</#each>`
```
例中的refer参数也可以传入多个值，如`{foo 'and' bar}`。

表达式块内每个参数也都可以添加过滤器，这样就可以实现更复杂的逻辑，例如：
```js
nj`
<#if {type:filter1 type2:filter2}>
  test if block
</#if>`
```

* 自定义表达式块

表达式块可支持自定义，这样就可以自行为模板实现各种各样的逻辑及功能。例如实现一个`customIf`表达块：
```js
//测试模板：
nj`
<#customIf {type:filter1}>
  test if
<#else />
  test else
</#customIf>`

nj.registerExpr('customIf', (refer, options) => {
  let ret;
  if (!!refer) {  //refer即为替换参数"{type:filter1}"的执行结果
    ret = options.result();  //执行options.result，即输出"test if"
  }
  else {
    ret = options.inverse();  //执行options.inverse，即输出"test else"
  }

  if(options.useString && ret == null) {
    return '';
  }

  return ret;
});
```

###### 内置表达式块

* if块

举例：
```js
nj`
<div>
  this is the if block demo.
  <#if {type}>
    test if block
    <span>test1</span>
  </#if>
</div>`
```
在执行模板函数时，如if块的参数计算结果为true，则会执行if块内的模板；如为false则不会执行if块内的模板。

* else块

举例：
```js
nj`
<div>
  this is the if block demo
  <#if {type}>
    test if block
    <span>test1</span>
  <#else />  //else标签(1)
    <span>test2</span>  //type参数计算结果为false时执行此处的模板(2)
  </#if>
</div>`
```

1. else标签须定义在if块内，格式为`<#else />`。如例中(1)处所示。
2. 在执行模板函数时，如if块的参数计算结果为false，则会执行排在if块内的else标签之后的模板，如例中(2)处所示。

* unless块

举例：
```js
nj`
<#unless {type}>
  test unless block
  <span>test1</span>
<#else />
  <span>test2</span>
</#unless>`
```

unless块意义即为"除非"，它和if块取相反的值。例中如type参数为`false`，则会输出`<span>test1</span>`。

* each块

举例：
```js
var tmpl = nj`
<div>
  this is the if block demo{no}.
  <#each {items}>  //each块开始标签(1)
    test if block{no}  //items数组每项的no属性(2)
    <span>test{../no}</span>  //与items数组同一层的no属性(3)
  <#else />
    <span>test else{no}</span>  //排在else标签后的模板(4)
  </#each>
  <#each {numbers}>
    num:{.},  //点号表示使用数组项渲染(5)
    ['no:{#} ']  //#号表示使用数组项索引值渲染(6)
  </#each>
</div>`

var tmplFn = nj.compile(tmpl, 'tmpl1');
var html = tmplFn({
  no: 100,
  items: [
    { no: 200 },
    { no: 300 }
  ],
  numbers: [10, 20, 30]
});

console.log(html);
/*输出html:
<div>
  this is the if block demo100.
  test if block200
  <span>test100</span>
  test if block300
  <span>test100</span>
  num:10,no:0 num:20,no:1 num:30,no:2
</div>
*/

var html2 = tmplFn({
  no: 100,
  items: null,
  numbers: null
});

console.log(html2);
/*输出html:
<div>
  this is the if block demo100.
  <span>test else100</span>
</div>
*/
```

1. each块接受一个js数组格式的参数，如例中(1)处的"{items}"参数。
2. each块会遍历参数数组中的数据，将数组中的每一项数据都执行渲染。在遍历每个数组项时，会使用每项的数据作为当前节点的数据，相当于生成了一个上下文。如例中(2)处所示，"{no}"参数为items数组内各项的no值。
3. 在遍历每个数组项时也可以使用父级上下文的数据，如例中(3)处所示，"{../no}"表示获取和items参数同一级的no值。和一般的目录描述方法类似，"../"可以写多次，每次代表向上退一级上下文。
4. 在each块中也可以使用else标签，如"{items}"参数为null或false时，则会执行排在else标签后面的模板。如例中(4)处所示，在else标签后面的模板并不会产生上下文，"{no}"参数为items参数同一级的no值。
5. each块内可以使用点号"{.}"设置替换参数，表示使用数组项渲染，如例中(5)处所示。
6. each块内还可以使用#号"{#}"设置替换参数，表示使用数组项索引值渲染，如例中(6)处所示。

* param块

param块可以提供另外一种定义元素节点参数的方式。用param块定义的节点参数可以内嵌或包裹其他表达式块，能够提供更丰富的动态生成逻辑。举例如下：
```js
var tmpl = nj`
<div name=foo>
  <#params>  //定义params块
    <#param {"name"}>bar</#param>  //节点参数键为字符串，值也为字符串(1)
    <#param {"id"}>{test}</#param>  //节点参数键为字符串，值为替换参数(2)
    <#param {"id2"}>  //节点参数值为表达式块的执行结果(3)
      <#each {list}>
        {no}
      </#each>
    </#param>
    <#each {list}>  //根据表达式块的执行结果动态构建节点参数(4)
      <#param {"data-id(" no ")"}>{"test" no}</#param>
    </#each>
  </#params>
  this is a param block demo.
</div>`

var tmplFn = nj.compile(tmpl, 'tmpl1');
var html = tmplFn({
  list: [
    { no: 1 },
    { no: 2 },
    { no: 3 }
  ]
});

console.log(html);
/*输出html:
<div name="bar" id="test" id2="123" data-id(1)="test1" data-id(2)="test2" data-id(3)="test3">
this is a param block demo.
</div>
*/
```

1. 每个元素节点可以有一个params块子节点。params块内部可以定义任意个param块，每个param块为该元素节点定义一个节点参数。
2. param块开始标签内的参数为节点参数名称。使用字符串或替换参数都可以，也可以加过滤器。如例中(1)、(2)处所示。
3. param块的子节点为节点参数值。如果有多个子节点，则节点参数值为这些子节点值连成的一个完整字符串。如例中(3)处所示。
4. param块也可以用each块等其他表达式块包裹，这样就可以动态生成多个节点参数。如例中(4)处所示。
5. 使用param块定义节点参数的优先级会高于直接定义在节点的开始标签内，如例中(2)处的name属性就覆盖了节点标签中定义的name属性。

---
#### 在ES5环境下构建模板

NornJ模板字符串也可以支持es5兼容写法。如果模板需要嵌套，则须要使用${x}的方式来定义替换参数，x为从0开始的整数。如下所示：
```html
<script id="tmpl1" type="text/nornj">
  <div>
    <slider />
  </div>
</script>

<script id="tmpl2" type="text/nornj">
  <span>
    <slider />
  </span>
</script>

<script id="tmpl3" type="text/nornj">
  <section>
    ${0}
    <br />
    ${1}
    ${2}
  </section>
</script>
```
```js
var tmplStr1 = document.getElementById('tmpl1').innerHTML,
  tmplStr2 = document.getElementById('tmpl2').innerHTML,
  tmplStr3 = document.getElementById('tmpl3').innerHTML,
  tmpl4 = nj('<input type=button />');

var tmpl = nj(   //须使用nj函数处理字符串
  tmplStr3,      //第一个参数为html字符串，其中可以用${x}的方式来定义任意个替换参数
  nj(tmplStr1),  //从第二个参数开始为填充模板中的"${x}"占位符，可以使用nj函数返回的模板对象
  tmplStr2,      //占位符替换参数也可以直接传入字符串
  tmpl4          //占位符替换参数也可以传入nj函数返回的模板
);

//编译并执行模板
var html = nj.compile(tmpl)();

console.log(html);
/* 输出html:
<section>
  <div>
    <slider />
  </div>
  <br />
  <span>
    <slider />
  </span>
  <input type=button />
</section>
*/
```
