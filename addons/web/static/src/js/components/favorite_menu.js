odoo.define('web.FavoriteMenuRegistry', function (require) {
    "use strict";

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

    const { useDispatch, useGetters, useState } = owl.hooks;

    class FavoriteMenu extends DropdownMenu {
        constructor() {
            super(...arguments);

            this.dispatch = useDispatch(this.env.controlPanelModel);
            this.getters = useGetters(this.env.controlPanelModel);
            this.state = useState({
                deletedFavorite: false,
            });
            useListener('item-selected', this._onItemSelected);
        }

        //--------------------------------------------------------------------------
        // Getters
        //--------------------------------------------------------------------------

        /**
         * @override
         */
        get items() {
            const favorites = this.getters.getFiltersOfType('favorite');
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

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

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
            const { item, option } = ev.detail;
            if (option) {
                this.dispatch('toggleFilterWithOptions', item.id, option.optionId);
            } else {
                this.dispatch('toggleFilter', item.id);
            }
        }

        /**
         * @private
         */
        async _onRemoveFavorite() {
            await this.dispatch('deleteFavorite', this.state.deletedFavorite.id);
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
        // todo remove this and think!
        viewType: "",
    });
    FavoriteMenu.props = Object.assign({}, DropdownMenu.props, {
        fields: Object,
        viewType: String,
    });
    FavoriteMenu.template = 'FavoriteMenu';

    return FavoriteMenu;
});
