odoo.define('board.AddToBoardMenu', function (require) {
    "use strict";

    const Context = require('web.Context');
    const Domain = require('web.Domain');
    const FavoriteMenuRegistry = require('web.FavoriteMenuRegistry');
    const pyUtils = require('web.py_utils');
    const DropdownMenuItem = require('web.DropdownMenuItem');
    const { sprintf } = require('web.utils');
    const { useFocusOnUpdate } = require('web.custom_hooks');

    const { useState } = owl.hooks;

    class AddToBoardMenu extends DropdownMenuItem {
        constructor() {
            super(...arguments);

            this.interactive = true;
            this.state = useState({
                name: this.env.action.name || "",
                open: false,
            });

            this.focusOnUpdate = useFocusOnUpdate();
            this.focusOnUpdate();
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * This is the main function for actually saving the dashboard.  This method
         * is supposed to call the route /board/add_to_dashboard with proper
         * information.
         *
         * @private
         * @returns {Promise}
         */
        async _addToBoard() {
            const searchQuery = this.env.controlPanelModel.getQuery();
            const context = new Context(this.env.action.context);
            context.add(searchQuery.context);
            context.add({
                group_by: searchQuery.groupBy,
                orderedBy: searchQuery.orderedBy,
            });
            if (searchQuery.timeRanges && searchQuery.timeRanges.hasOwnProperty('fieldName')) {
                const { fieldName: field, range, comparisonRange } = searchQuery.timeRanges;
                context.add({
                    time_ranges : { field, range, comparisonRange },
                });
            }

            let controllerQueryParams = await new Promise(resolve => {
                this.env.controlPanelModel.trigger('get-controller-query-params', resolve);
            });
            controllerQueryParams = controllerQueryParams || {};
            controllerQueryParams.context = controllerQueryParams.context || {};
            const queryContext = controllerQueryParams.context;
            delete controllerQueryParams.context;
            context.add(Object.assign(controllerQueryParams, queryContext));

            const domainArray = new Domain(this.env.action.domain || []);
            const domain = Domain.prototype.normalizeArray(domainArray.toArray().concat(searchQuery.domain));

            const evalutatedContext = pyUtils.eval('context', context);
            for (const key in evalutatedContext) {
                if (evalutatedContext.hasOwnProperty(key) && /^search_default_/.test(key)) {
                    delete evalutatedContext[key];
                }
            }
            evalutatedContext.dashboard_merge_domains_contexts = false;

            Object.assign(this.state, {
                name: this.env.action.name || "",
                open: false,
            });

            const result = await this.rpc({
                route: '/board/add_to_dashboard',
                params: {
                    action_id: this.env.action.id || false,
                    context_to_save: evalutatedContext,
                    domain: domain,
                    view_mode: this.props.viewType,
                    name: this.state.name,
                },
            });
            if (result) {
                this.env.services.notification.notify({
                    title: sprintf(this.env._t("'%s' added to dashboard"), this.state.name),
                    message: this.env._t("Please refresh your browser for the changes to take effect."),
                    type: 'warning',
                });
            } else {
                this.env.services.notification.notify({
                    message: this.env._t("Could not add filter to dashboard"),
                    type: 'danger',
                });
            }
        }

        /**
         * Hide and display the submenu which allows adding to board.
         * @private
         */
        _toggleOpen() {
            this.state.open = !this.state.open;
            if (this.state.open) {
                this.focusOnUpdate();
            }
        }


        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * @private
         * @param {KeyboardEvent} ev
         */
        _onInputKeydown(ev) {
            switch (ev.key) {
                case 'Enter':
                    ev.preventDefault();
                    this._addToBoard();
                    break;
                case 'Escape':
                    // Gives the focus back to the component.
                    ev.preventDefault();
                    ev.target.blur();
                    break;
            }
        }
    }

    AddToBoardMenu.props = {
        viewType: String,
    };
    AddToBoardMenu.template = 'AddToBoardMenu';

    FavoriteMenuRegistry.add('add-to-board-menu', {
        Component: AddToBoardMenu,
        getProps() {
            return { viewType: this.props.viewType };
        },
        validate() {
            return this.env.action.type === 'ir.actions.act_window';
        },
    }, 10);

    return AddToBoardMenu;
});
