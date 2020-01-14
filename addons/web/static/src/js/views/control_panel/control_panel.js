odoo.define('web.ControlPanel', function (require) {
    "use strict";

    const { useBaseModel } = require('web.base_model');
    const ControlPanelModel = require('web.ControlPanelModel');
    const FavoriteMenu = require('web.FavoriteMenu');
    const FilterMenu = require('web.FilterMenu');
    const GroupByMenu = require('web.GroupByMenu');
    const Pager = require('web.Pager');
    const SearchBar = require('web.SearchBar');
    const Sidebar = require('web.Sidebar');
    const TimeRangeMenu = require('web.TimeRangeMenu');

    const { Component, hooks } = owl;
    const { useRef, useState, useSubEnv } = hooks;

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
                controlPanelModel: this.props.controlPanelModel,
            });

            this.state = useState(this._getInitialState());
            if (this.env.controlPanelModel) {
                useBaseModel(state => state, { baseModel: this.env.controlPanelModel });
            }

            // Reference hooks
            this.contentRefs = {
                buttons: useRef('buttons'),
                pager: useRef('pager'),
                searchView: useRef('searchView'),
                searchViewButtons: useRef('searchViewButtons'),
            };
        }

        async willUpdateProps(nextProps) {
            if ('action' in nextProps) {
                this.env.action = nextProps.action;
            }
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * @private
         * @returns {Object}
         */
        _getInitialState() {
            return {
                displayDropdowns: true,
                openedMenu: null,
            };
        }
    }

    ControlPanel.components = {
        SearchBar,
        Sidebar, Pager,
        FilterMenu, GroupByMenu, TimeRangeMenu, FavoriteMenu,
    };
    ControlPanel.defaultProps = {
        breadcrumbs: [],
        searchMenuTypes: [],
        views: [],
        withBreadcrumbs: true,
        withSearchBar: true,
    };
    // todo review default props and props
    ControlPanel.props = {
        action: Object,
        breadcrumbs: Array,
        controlPanelModel: ControlPanelModel,
        fields: Object,
        pager: { validate: p => typeof p === 'object' || p === null, optional: 1 },
        searchMenuTypes: Array,
        sidebar: { validate: s => typeof s === 'object' || s === null, optional: 1 },
        title: { type: String, optional: 1 },
        viewType: { type: String, optional: 1 },
        views: Array,
        withBreadcrumbs: Boolean,
        withSearchBar: Boolean,
    };
    ControlPanel.template = 'ControlPanel';

    return ControlPanel;
});

