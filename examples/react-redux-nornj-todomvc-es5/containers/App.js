﻿var _App = React.createClass({
  propTypes: {
    visibleTodos: React.PropTypes.arrayOf(React.PropTypes.shape({
      text: React.PropTypes.string.isRequired,
      completed: React.PropTypes.bool.isRequired
    }).isRequired).isRequired,
    visibilityFilter: React.PropTypes.oneOf([
      'SHOW_ALL',
      'SHOW_COMPLETED',
      'SHOW_ACTIVE'
    ]).isRequired
  },
  template: nj.compileComponent(AppTmpl, 'App'),
  addClick: function (text) {
    this.props.dispatch(addTodo(text));
  },
  todoClick: function (index) {
    this.props.dispatch(completeTodo(index));
  },
  filterChange: function (nextFilter) {
    this.props.dispatch(setVisibilityFilter(nextFilter));
  },
  render: function () {
    return this.template(
      [
        this.props,
        {
          addClick: this.addClick,
          todoClick: this.todoClick,
          filterChange: this.filterChange
        }
      ]
    );
  }
});

function selectTodos(todos, filter) {
  switch (filter) {
    case VisibilityFilters.SHOW_ALL:
      return todos
    case VisibilityFilters.SHOW_COMPLETED:
      return todos.filter(function (todo) {
        return todo.completed;
      });
    case VisibilityFilters.SHOW_ACTIVE:
      return todos.filter(function (todo) {
        return !todo.completed;
      });
  }
}

// Which props do we want to inject, given the global state?
// Note: use https://github.com/faassen/reselect for better performance.
function select(state) {
  return {
    visibleTodos: selectTodos(state.todos, state.visibilityFilter),
    visibilityFilter: state.visibilityFilter
  }
}

//Wrap component,inject dispatch and state into its default connect(select)(App)
var App = ReactRedux.connect(select)(_App);
nj.registerComponent('App', App);