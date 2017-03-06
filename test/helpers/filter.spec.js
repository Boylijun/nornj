﻿import { render } from '../../src/compiler/compile';
import '../../src/utils/setTmplRule';

describe('filter', () => {
  it('.', () => {
    expect(render("{{ a .('b') .('length') }}", {
      a: {
        b: 'abc'
      }
    })).toBe(3);
  });

  it('>', () => {
    expect(render('{{ 2 >(1) }}')).toBe(true);
  });

  it('>=', () => {
    expect(render('{{ 2 >=(2) }}')).toBe(true);
  });

  it('<', () => {
    expect(render('{{ 2 <(1) }}')).toBe(false);
  });

  it('<=', () => {
    expect(render('{{ 2 <=(1) }}')).toBe(false);
  });

  it('==', () => {
    expect(render('{{ 1 ==(1) }}')).toBe(true);
  });

  it('===', () => {
    expect(render('{{ 1 ===(1) }}')).toBe(true);
  });

  it('!', () => {
    expect(render('{{ true | ! }}')).toBe(false);
  });

  it('+', () => {
    expect(render('{{ 1 +(2 +(3)) }}')).toBe(6);
  });

  it('-', () => {
    expect(render('{{ 3 -(2) -(1) }}')).toBe(0);
  });
});