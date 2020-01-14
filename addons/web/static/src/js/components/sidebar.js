odoo.define('web.SidebarRegistry', function (require) {
    "use strict";

    const Registry = require('web.Registry');

    return new Registry();
});

odoo.define('web.Sidebar', function (require) {
    "use strict";

    const Context = require('web.Context');
    const DropdownMenu = require('web.DropdownMenu');
    const pyUtils = require('web.py_utils');
    const SidebarRegistry = require('web.SidebarRegistry');
    const { useListener } = require('web.custom_hooks');

    const { Component } = owl;

    class Sidebar extends Component {

        constructor() {
            super(...arguments);
            useListener('item-selected', this._onItemSelected);
        }

        mounted() {
            this._addTooltips();
        }

        patched() {
            this._addTooltips();
        }

        //--------------------------------------------------------------------------
        // Getters
        //--------------------------------------------------------------------------

        /**
         * @returns {Object[]}
         */
        get actionItems() {
            // Callback based actions
            const callbackActions = (this.props.items.other || []).map(
                action => Object.assign({ key: `action-${action.description}` }, action)
            );
            // Action based actions
            const actionActions = this.props.items.action || [];
            const relateActions = this.props.items.relate || [];
            const formattedActions = [...actionActions, ...relateActions].map(
                action => ({ action, description: action.name, key: action.id })
            );
            // Sidebar action registry components
            const registryActions = SidebarRegistry.values().map(
                ({ Component, getProps }, index) => ({
                    key: `registry-action-${index}`,
                    Component,
                    props: getProps.call(this),
                })
            );
            return [...callbackActions, ...formattedActions, ...registryActions];
        }

        /**
         * @returns {Object[]}
         */
        get printItems() {
            const printActions = this.props.items.print || [];
            const printItems = printActions.map(
                action => ({ action, description: action.name })
            );
            return printItems;
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * Add teh tooltips to the items
         * @private
         */
        _addTooltips() {
            $(this.el.querySelectorAll('[title]')).tooltip({
                delay: { show: 500, hide: 0 }
            });
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * Perform the action for the item clicked after getting the data
         * necessary with a trigger.
         * @private
         * @param {OwlEvent} ev
         */
        async _executeAction(action) {
            const activeIdsContext = {
                active_id: this.props.activeIds[0],
                active_ids: this.props.activeIds,
                active_model: this.env.action.res_model,
                select_all: this.props.selectAll,
            };
            if (this.props.domain) {
                activeIdsContext.active_domain = this.props.domain;
            }

            const context = pyUtils.eval('context', new Context(this.props.context, activeIdsContext));
            const result = await this.rpc({
                route: '/web/action/load',
                params: {
                    action_id: action.id,
                    context: context,
                },
            });
            result.context = new Context(result.context || {}, activeIdsContext)
                .set_eval_context(context);
            result.flags = result.flags || {};
            result.flags.new_window = true;
            this.trigger('do_action', {
                action: result,
                options: {
                    on_close: () => this.trigger('reload'),
                },
            });
        }

        /**
         * @private
         * @param {OwlEvent} ev
         */
        _onItemSelected(ev) {
            ev.stopPropagation();
            const { item } = ev.detail;
            if (item.callback) {
                item.callback([item]);
            } else if (item.action) {
                this._executeAction(item.action);
            } else if (item.url) {
                // Event has been prevented at its source: we need to redirect manually.
                window.location = item.url;
            }
        }
    }

    Sidebar.components = { DropdownMenu };
    Sidebar.props = {
        activeIds: { type: Array, element: Number },
        context: Object,
        domain: { type: Array, optional: 1 },
        items: {
            type: Object,
            shape: {
                action: { type: Array, optional: 1 },
                print: { type: Array, optional: 1 },
                other: { type: Array, optional: 1 },
            },
        },
        selectAll: { type: Boolean, optional: 1 },
        viewType: String,
    };
    Sidebar.template = 'Sidebar';

    return Sidebar;
});
