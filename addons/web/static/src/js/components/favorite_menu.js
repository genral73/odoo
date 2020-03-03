odoo.define('web.FavoriteMenuRegistry', function (require) {
    "use strict";

    /**
     * Defines the registry used in the FavoriteMenu component.
     */
    const Registry = require('web.Registry');

    return new Registry();
});

odoo.define('web.FavoriteMenu', function (require) {
    "use strict";

    const FavoriteGeneratorMenu = require('web.FavoriteGeneratorMenu');
    const FavoriteMenuRegistry = require('web.FavoriteMenuRegistry');
    const Dialog = require('web.OwlDialog');
    const DropdownMenu = require('web.DropdownMenu');
    const { useListener } = require('web.custom_hooks');
    const { useModel } = require('web.model');

    const { useState } = owl.hooks;

    /**
     * 'Favorites' menu
     *
     * Simple rendering of the filters of type `favorites` given by the control panel
     * model. It uses most of the behaviours implemented by the dropdown menu Component,
     * with the addition of a submenu registry used to display additional components.
     * Only the favorite generator (@see FavoriteGeneratorMenu) is registered in
     * the `web` module.
     * @see DropdownMenu for additional details.
     * @extends DropdownMenu
     */
    class FavoriteMenu extends DropdownMenu {
        constructor() {
            super(...arguments);

            this.model = useModel('controlPanelModel');
            this.state = useState({
                deletedFavorite: false,
            });
            useListener('item-selected', this._onItemSelected);
        }

        //---------------------------------------------------------------------
        // Getters
        //---------------------------------------------------------------------

        /**
         * @override
         */
        get items() {
            const favorites = this.model.getFiltersOfType('favorite');
            const registryMenus = FavoriteMenuRegistry.values().reduce(
                (menus, { Component, getProps, validate }) => {
                    if (validate.call(this)) {
                        menus.push({
                            key: Component.name,
                            Component,
                            props: getProps.call(this),
                        });
                    }
                    return menus;
                },
                []
            );
            return [...favorites, ...registryMenus];
        }

        //---------------------------------------------------------------------
        // Handlers
        //---------------------------------------------------------------------

        /**
         * @private
         * @param {OwlEvent} ev
         */
        _onItemRemoved(ev) {
            const favorite = this.items.find(fav => fav.id === ev.detail.item.id);
            this.state.deletedFavorite = favorite;
        }

        /**
         * @private
         * @param {OwlEvent} ev
         */
        _onItemSelected(ev) {
            ev.stopPropagation();
            this.model.dispatch('toggleFilter', ev.detail.item.id);
        }

        /**
         * @private
         */
        async _onRemoveFavorite() {
            await this.model.dispatch('deleteFavorite', this.state.deletedFavorite.id);
            this.state.deletedFavorite = false;
        }
    }

    FavoriteMenu.components = Object.assign({}, DropdownMenu.components, {
        FavoriteGeneratorMenu,
        Dialog,
    });
    FavoriteMenu.defaultProps = Object.assign({}, DropdownMenu.defaultProps, {
        icon: 'fa fa-star',
        title: "Favorites",
    });
    FavoriteMenu.props = Object.assign({}, DropdownMenu.props, {
        fields: Object,
        viewType: { type: String, optional: 1 },
    });
    FavoriteMenu.template = 'FavoriteMenu';

    return FavoriteMenu;
});
