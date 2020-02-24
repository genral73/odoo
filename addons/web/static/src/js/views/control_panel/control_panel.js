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
     * Extract the 'cp_content' key of the given props and return them as well as
     * the extracted content.
     * @param {Object} props
     * @returns {Object}
     */
    function getAdditionalContent(props) {
        const additionalContent = {};
        if ('cp_content' in props) {
            const content = props.cp_content || {};
            if ('$buttons' in content) {
                additionalContent.buttons = content.$buttons;
            }
            if ('$searchview' in content) {
                additionalContent.searchView = content.$searchview;
            }
            if ('$pager' in content) {
                additionalContent.pager = content.$pager;
            }
            if ('$searchview_buttons' in content) {
                additionalContent.searchViewButtons = content.$searchview_buttons;
            }
        }
        return additionalContent;
    }

    /**
     * Control panel
     *
     * The control panel of the action.
     * @extends Component
     */
    class ControlPanel extends Component {
        constructor() {
            super(...arguments);

            this.additionalContent = getAdditionalContent(this.props);

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

        mounted() {
            this._attachAdditionalContent();
        }

        patched() {
            this._attachAdditionalContent();
        }

        async willUpdateProps(nextProps) {
            this.additionalContent = getAdditionalContent(nextProps);
            if ('action' in nextProps) {
                this.env.action = nextProps.action;
            }
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * Attach additional content extracted from the props 'cp_content' key, if any.
         * @private
         */
        _attachAdditionalContent() {
            for (const key in this.additionalContent) {
                if (this.additionalContent[key] && this.additionalContent[key].length) {
                    const target = this.contentRefs[key].el;
                    if (target) {
                        target.innerHTML = "";
                        target.append(...this.additionalContent[key]);
                    }
                }
            }
        }

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
        cp_content: { type: Object, optional: 1 },
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

