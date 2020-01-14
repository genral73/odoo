odoo.define('web.ControlPanel', function (require) {
    "use strict";

    const ControlPanelStore = require('web.ControlPanelStore');
    const FavoriteMenu = require('web.FavoriteMenu');
    const FilterMenu = require('web.FilterMenu');
    const GroupByMenu = require('web.GroupByMenu');
    const Pager = require('web.Pager');
    const SearchBar = require('web.SearchBar');
    const Sidebar = require('web.Sidebar');
    const TimeRangeMenu = require('web.TimeRangeMenu');

    const { Component, hooks } = owl;
    const { useDispatch, useRef, useState, useSubEnv, useStore, useGetters } = hooks;

    // FOR DEBUG
    const { onMounted, onWillUnmount, onWillPatch, onPatched, onWillStart, onWillUpdateProps } = hooks;

    /**
     * Control panel
     *
     * The control panel of the action.
     * @extends Component
     */
    class ControlPanel extends Component {
        constructor() {
            super(...arguments);

            useSubEnv({
                action: this.props.action,
                controlPanelStore: this.props.controlPanelStore,
            });


            this.state = useState(this.initialState);
            this.storeState = {};
            this._connectToStore(this.env.controlPanelStore);

            // Reference hooks
            this.contentRefs = {
                buttons: useRef('buttons'),
                searchView: useRef('searchView'),
                searchViewButtons: useRef('searchViewButtons'),
            };

            // <<<<<<<<<<<<<<<<<<< TO REMOVE: THIS IS A TEST SECTION

            if (this.constructor.name === 'ControlPanel') {
                window.top.cp = this;
                this.getChild = (name, comp = this) => {
                    if (comp.constructor.name === name) {
                        return comp;
                    }
                    for (const child of Object.values(comp.__owl__.children)) {
                        const found = this.getChild(name, child);
                        if (found) {
                            return found;
                        }
                    }
                    return false;
                };
                this.__DEBUG__createdAt = Date.now();
                const log = (method, ...args) => {
                    const timeStamp = Date.now() - this.__DEBUG__createdAt;
                    const ms = (timeStamp % 1000).toString().padStart(3, '0');
                    const s = Math.floor((timeStamp / 1000) % 60).toString().padStart(2, '0');
                    const m = Math.floor((timeStamp / (60 * 1000)) % 60).toString().padStart(2, '0');
                    const h = Math.floor(timeStamp / (60 * 60 * 1000));
                    const color = '#' + (Math.floor(Math.random() * 6) + 1).toString(2).padStart(3, '0').replace(/0/g, '00').replace(/1/g, 'ff');
                    if (typeof args[0] === 'string') {
                        return console[method](`%c${h}:${m}:${s}:${ms} %c${args.shift()}`, 'color: #9a80ff;', `color: ${color};`, ...args);
                    } else {
                        return console[method](`%c${h}:${m}:${s}:${ms}`, 'color: #9a80ff;', ...args);
                    }
                };
                this.error = log.bind(this, 'error');
                this.log = log.bind(this, 'log');
                this.trace = log.bind(this, 'trace');
                this.warn = log.bind(this, 'warn');

                this.warn('Created new control panel', this.props);
                onWillStart(() => this.log('ControlPanel will start'));
                onMounted(() => this.log('ControlPanel mounted'));
                onWillUnmount(() => this.log('ControlPanel will unmount'));
                onPatched(() => {
                    if (this.__DEBUG__propsUpdating) {
                        this.log('ControlPanel rendered its new props', this.__DEBUG__propsUpdating);
                        this.__DEBUG__propsUpdating = false;
                    }
                });
                onWillUpdateProps(nextProps => {
                    this.log('ControlPanel will update props to', nextProps);
                    this.__DEBUG__propsUpdating = nextProps;
                });
            }

            // >>>>>>>>>>>>>>>>>>>
        }

        async willUpdateProps(nextProps) {
            if ('action' in nextProps) {
                this.env.action = nextProps.action;
            }
        }

        //--------------------------------------------------------------------------
        // Getters
        //--------------------------------------------------------------------------

        /**
         * @returns {Object}
         */
        get initialState() {
            return {
                displayDropdowns: true,
                openedMenu: null,
            };
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * Overriden when no store is used (@see ControlPanelX2Many for example).
         * @private
         * @param {ControlPanelStore} store
         */
        _connectToStore(store) {
            this.storeState = useStore(state => state, { store });
            this.query = useStore(state => state.query, {
                store,
                onUpdate: () => {
                    this.trigger('search', store.getQuery());
                },
            });
            this.dispatch = useDispatch(store);
            this.getters = useGetters(store);
        }
    }

    ControlPanel.components = { Pager, SearchBar, Sidebar, FilterMenu, TimeRangeMenu, GroupByMenu, FavoriteMenu };
    ControlPanel.defaultProps = {
        breadcrumbs: [],
        views: [],
        withBreadcrumbs: true,
        withSearchBar: true,
        searchMenuTypes: [],
    };
    // todo review default props and props
    ControlPanel.props = {
        action: Object,
        breadcrumbs: Array,
        controlPanelStore: ControlPanelStore,
        fields: Object,
        modelName: String,
        pager: { validate: p => typeof p === 'object' || p === null, optional: 1 },
        searchMenuTypes: Array,
        sidebar: { validate: s => typeof s === 'object' || s === null, optional: 1 },
        title: { type: String, optional: 1 },
        viewType: { type: String, optional: 1 },
        views: Array,
        withBreadcrumbs: Boolean,
        withSearchBar: Boolean,
        buttons: { type: Object, optional: 1 }, // jQuery
    };
    ControlPanel.template = 'ControlPanel';

    return ControlPanel;
});

