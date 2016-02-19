﻿var SHOW_ALL = VisibilityFilters.SHOW_ALL;

function visibilityFilter(state, action) {
    if (!state) {
        state = SHOW_ALL;
    }

    switch (action.type) {
        case SET_VISIBILITY_FILTER:
            return action.filter
        case ReactRouterRedux.UPDATE_LOCATION:
            var filter = action.payload.pathname.substr(1);
            switch (filter) {
                case '':
                case 'all':
                    return 'SHOW_ALL';
                case 'active':
                    return 'SHOW_ACTIVE';
                case 'completed':
                    return 'SHOW_COMPLETED';
            }
        default:
            return state
    }
}

function todos(state, action) {
    if (!state) {
        state = [];
    }

    switch (action.type) {
        case ADD_TODO:
            return state.concat([{
                text: action.text,
                completed: false
            }]);
        case COMPLETE_TODO:
            return state.slice(0, action.index).concat(nj.assign({}, state[action.index], {
                completed: true
            })).concat(state.slice(action.index + 1));
        default:
            return state
    }
}

var todoApp = {
    visibilityFilter: visibilityFilter,
    todos: todos
};