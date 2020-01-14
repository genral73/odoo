odoo.define('web.FavoriteGeneratorMenu', function (require) {
    "use strict";

    const DropdownMenuItem = require('web.DropdownMenuItem');
    const FavoriteMenuRegistry = require('web.FavoriteMenuRegistry');
    const { useFocusOnUpdate } = require('web.custom_hooks');

    const { useDispatch, useGetters, useRef, useState } = owl.hooks;

    let favoriteId = 0;

    class FavoriteGeneratorMenu extends DropdownMenuItem {
        constructor() {
            super(...arguments);

            const favId = favoriteId++;
            this.useByDefaultId = `o_favorite_use_by_default_${favId}`;
            this.shareAllUsersId = `o_favorite_share_all_users_${favId}`;

            this.descriptionRef = useRef('description');
            this.dispatch = useDispatch(this.env.controlPanelModel);
            this.getters = useGetters(this.env.controlPanelModel);
            this.interactive = true;
            this.state = useState({
                description: this.env.action.name || "",
                isDefault: false,
                isShared: false,
                open: false,
            });

            this.focusOnUpdate = useFocusOnUpdate();
            this.focusOnUpdate();
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * @private
         */
        _saveFavorite() {
            if (!this.state.description.length) {
                this.env.services.notification.notify({
                    title: this.env._t("Error"),
                    message: this.env._t("A name for your favorite is required."),
                    type: 'danger',
                });
                return this.descriptionRef.el.focus();
            }
            const favorites = this.getters.getFiltersOfType('favorite');
            if (favorites.some(f => f.description === this.state.description)) {
                this.env.services.notification.notify({
                    title: this.env._t("Error"),
                    message: this.env._t("Filter with same name already exists."),
                    type: 'danger',
                });
                return this.descriptionRef.el.focus();
            }
            this.dispatch('createNewFavorite', {
                type: 'favorite',
                description: this.state.description,
                isDefault: this.state.isDefault,
                isShared: this.state.isShared,
            });
            // Reset state
            Object.assign(this.state, {
                description: this.env.action.name || "",
                isDefault: false,
                isShared: false,
                open: false,
            });
        }

        /**
         * Hide and display the submenu which allows adding custom filters.
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
         * @param {Event} ev change Event
         */
        _onCheckboxChange(ev) {
            const { checked, id } = ev.target;
            if (this.useByDefaultId === id) {
                this.state.isDefault = checked;
                if (checked) {
                    this.state.isShared = false;
                }
            } else {
                this.state.isShared = checked;
                if (checked) {
                    this.state.isDefault = false;
                }
            }
        }

        /**
         * @private
         * @param {jQueryEvent} ev
         */
        _onInputKeydown(ev) {
            switch (ev.key) {
                case 'Enter':
                    ev.preventDefault();
                    this._saveFavorite();
                    break;
                case 'Escape':
                    // Gives the focus back to the component.
                    ev.preventDefault();
                    ev.target.blur();
                    break;
            }
        }
    }

    FavoriteGeneratorMenu.template = 'FavoriteGeneratorMenu';

    FavoriteMenuRegistry.add('favorite-generator-menu', {
        Component: FavoriteGeneratorMenu,
        getProps() {
            return {};
        },
        validate() {
            return true;
        },
    }, 0);

    return FavoriteGeneratorMenu;
});
