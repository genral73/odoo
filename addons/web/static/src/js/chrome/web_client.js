odoo.define('web.WebClient', function (require) {
"use strict";

const ActionManager = require('web.ActionManager');
const { Action, DialogAction } = require('web.Action');
const { ComponentAdapter } = require('web.OwlCompatibility');
const LoadingWidget = require('web.Loading');
const Menu = require('web.Menu');
const RainbowMan = require('web.RainbowMan');

const { Component, hooks } = owl;
const useRef = hooks.useRef;

class WebClient extends Component {
    constructor() {
        super();
        this.LoadingWidget = LoadingWidget;
        this.renderingInfo = null;
        this.currentControllerComponent = useRef('currentControllerComponent');
        this.actionManager = new ActionManager(this.env);
        this.actionManager.on('cancel', this, () => {
            if (this.renderingInfo) {
                this.__owl__.currentFiber.cancel();
            }
        });
        this.actionManager.on('update', this, payload => {
            if (this.rainbowMan) {
                this.rainbowMan.destroy();
            }
            this.renderingInfo = payload;
            if (!this.renderingInfo.menuID && !this.state.menu_id && payload.main) {
                // retrieve menu_id from action
                const menu = Object.values(this.menus).find(menu => {
                    return menu.actionID === payload.main.action.id;
                });
                this.renderingInfo.menuID = menu && menu.id;
            }
            this._domCleaning();
            this.render();
        });
        this.menu = useRef('menu');

        this.ignoreHashchange = false;

        // the state of the webclient contains information like the current
        // menu id, action id, view type (for act_window actions)...
        this.state = {};
        this.rainbowMan = null;
    }

    get titleParts() {
        this._titleParts = this._titleParts || {};
        return this._titleParts;
    }
    // TODO: handle set_title* events
    setTitlePart(part, title) {
        this.titleParts[part] = title;
    }

    async willStart() {
        this.menus = await this._loadMenus();
        this.actionManager.menus = this.menus;

        const state = this._getUrlState();
        this._determineCompanyIds(state);
        return this.actionManager.loadState(state, { menuID: state.menu_id });
    }
    mounted() {
        this._onHashchange = () => {
            if (!this.ignoreHashchange) {
                const state = this._getUrlState();
                this.actionManager.loadState(state, { menuID: state.menu_id });
            }
            this.ignoreHashchange = false;
            // TODO: reset oldURL in case of failure?
        };
        window.addEventListener('hashchange', this._onHashchange);
        super.mounted();
        this._wcUpdated();
        
        odoo.isReady = true;
        this.env.bus.trigger('web-client-mounted');
    }
    willPatch() {
        super.willPatch();
        const scrollPosition = this._getScrollPosition();
        this.actionManager.storeScrollPosition(scrollPosition);
    }
    patched() {
        super.patched();
        this._wcUpdated();
    }

    catchError(e) {
        if (e && e.name) {
            // Real runtime error
            throw e;
        }
        // Errors that have been handled before
        console.warn(e);
        if (this.renderingInfo) {
            this.renderingInfo.onFail();
        }
        this.actionManager.restoreController();
    }
    willUnmount() {
        window.removeEventListener('hashchange', this._onHashchange);
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _getWindowHash() {
        return window.location.hash;
    }
    _setWindowHash(newHash) {
        this.ignoreHashchange = true;
        window.location.hash = newHash;
    }
    /**
     * @private
     * @returns {Object}
     */
    _getUrlState() {
        const hash = this._getWindowHash();
        const hashParts = hash ? hash.substr(1).split("&") : [];
        const state = {};
        for (const part of hashParts) {
            const [ key, val ] = part.split('=');
            let decodedVal;
            if (val === undefined) {
                decodedVal = '1';
            } else {
                decodedVal = decodeURI(val);
            }
            state[key] = isNaN(decodedVal) ? decodedVal : parseInt(decodedVal, 10);
        }

        return state;
    }
    _determineCompanyIds(state) {
        const userCompanies = this.env.session.user_companies;
        const currentCompanyId = userCompanies.current_company[0];
        if (!state.cids) {
            state.cids = this.env.services.getCookie('cids') || currentCompanyId;
        }
        let stateCompanyIds = state.cids.toString().split(',').map(id => parseInt(id, 10));
        const userCompanyIds = userCompanies.allowed_companies.map(company => company[0]);
        // Check that the user has access to all the companies
        if (!_.isEmpty(_.difference(stateCompanyIds, userCompanyIds))) {
            state.cids = String(currentCompanyId);
            stateCompanyIds = [currentCompanyId];
        }
        this.env.session.user_context.allowed_company_ids = stateCompanyIds;
    }
    /**
     * FIXME: consider moving this to menu.js
     * Loads and sanitizes the menu data
     *
     * @private
     * @returns {Promise<Object>}
     */
    _loadMenus() {
        if (!odoo.loadMenusPromise) {
            throw new Error('can we get here? tell aab if so');
        }
        const loadMenusPromise = odoo.loadMenusPromise || odoo.reloadMenus();
        return loadMenusPromise.then(menuData => {
            // set action if not defined on top menu items
            for (let app of menuData.children) {
                let child = app;
                while (app.action === false && child.children.length) {
                    child = child.children[0];
                    app.action = child.action;
                }
            }

            // sanitize menu data:
            //  - menus ({menuID: menu}): flat representation of all menus
            //  - menu: {
            //      id
            //      name
            //      children (array of menu ids)
            //      appID (id of the parent app)
            //      actionID
            //      actionModel (e.g. ir.actions.act_window)
            //      xmlid
            //    }
            // - menu.root.children: array of app ids
            const menus = {};
            function processMenu(menu, appID) {
                appID = appID || menu.id;
                for (let submenu of menu.children) {
                    processMenu(submenu, appID);
                }
                const action = menu.action && menu.action.split(',');
                const menuID = menu.id || 'root';
                menus[menuID] = {
                    id: menuID,
                    appID: appID,
                    name: menu.name,
                    children: menu.children.map(submenu => submenu.id),
                    actionModel: action ? action[0] : false,
                    actionID: action ? parseInt(action[1], 10) : false,
                    xmlid: menu.xmlid,
                };
            }
            processMenu(menuData);

            odoo.loadMenusPromise = null;
            return menus;
        });
    }
    /**
     * @private
     * @param {Object} state
     */
    _updateState(state) {
        // the action and menu_id may not have changed
        state.action = state.action || this.state.action || '';
        const menuID = state.menu_id || this.state.menu_id || '';
        if (menuID) {
            state.menu_id = menuID;
        }
        if ('title' in state) {
            this.setTitlePart('action', state.title);
            delete state.title
        }
        this.state = state;
        const hashParts = Object.keys(state).map(key => {
            const value = state[key];
            if (value !== null) {
                return `${key}=${encodeURI(value)}`;
            }
            return '';
        });
        const hash = "#" + hashParts.join("&");
        if (hash !== this._getWindowHash()) {
            this._setWindowHash(hash);
        }
        const fullTitle = this._computeTitle();
        this._setWindowTitle(fullTitle);
    }
    _wcUpdated() {
        if (this.renderingInfo) {
            let mainComponent;
            let state = {};
            if (this.renderingInfo.main) {
                const mainAction = this.renderingInfo.main.action;
                mainComponent = this.currentControllerComponent.comp;
                Object.assign(state, mainComponent.getState());
                state.action = mainAction.id;
                let active_id = null;
                let active_ids = null;
                if (mainAction.context) {
                    active_id = mainAction.context.active_id || null;
                    active_ids = mainAction.context.active_ids;
                    if (active_ids && !(active_ids.length === 1 && active_ids[0] === active_id)) {
                        active_ids = active_ids.join(',');
                    } else {
                        active_ids = null;
                    }
                }
                if (active_id) {
                    state.active_id = active_id;
                }
                if (active_ids) {
                    state.active_ids = active_ids;
                }
                if (!('title' in state)) {
                    state.title = mainComponent.title;
                }
                // keep cids in hash
                //this._determineCompanyIds(state);
                const scrollPosition = this.renderingInfo.main.controller.scrollPosition;
                if (scrollPosition) {
                    this._scrollTo(scrollPosition);
                }
            }
            if (this.renderingInfo.onSuccess) {
                this.renderingInfo.onSuccess(mainComponent); // FIXME: onSuccess not called if no background controller
            }
            if (this.renderingInfo.menuID) {
                state.menu_id = this.renderingInfo.menuID;
            }
            if (!this.renderingInfo.dialog) {
                this._updateState(state);
            }
        }
        this.renderingInfo = null;
    }
    _domCleaning() {
        const body = document.body;
        // multiple bodies in tests
        const tooltips = body.querySelectorAll('body .tooltip');
        for (let tt of tooltips) {
            tt.parentNode.removeChild(tt);
        }
    }
    _computeTitle() {
        const parts = Object.keys(this.titleParts).sort();
        let tmp = "";
        for (let part of parts) {
            const title = this.titleParts[part];
            if (title) {
                tmp = tmp ? tmp + " - " + title : title;
            }
        }
        return tmp;
    }
    /**
     * Returns the left and top scroll positions of the main scrolling area
     * (i.e. the '.o_content' div in desktop).
     *
     * @private
     * @returns {Object} with keys left and top
     */
    _getScrollPosition() {
        var scrollingEl = this.el.getElementsByClassName('o_content')[0];
        return {
            left: scrollingEl ? scrollingEl.scrollLeft : 0,
            top: scrollingEl ? scrollingEl.scrollTop : 0,
        };
    }
    _setWindowTitle(title) {
        document.title = title;
    }
    _getWindowTitle() {
        return document.title;
    }
    _scrollTo(scrollPosition) {
        const scrollingEl = this.el.getElementsByClassName('o_content')[0];
        if (!scrollingEl) {
            return;
        }
        // TODO: handle scrollTo events ( + scrolling to a selector)
        // let offset = {
        //     top: scrollPosition.top,
        //     left: scrollPosition.left || 0,
        // };
        // if (!offset.top) {
        //     offset = dom.getPosition(document.querySelector(ev.data.selector));
        //     // Substract the position of the scrolling element
        //     offset.top -= dom.getPosition(scrollingEl).top;
        // }

        scrollingEl.scrollTop = scrollPosition.top || 0;
        scrollingEl.scrollLeft = scrollPosition.left || 0;
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onOpenMenu(ev) {
        const action = this.menus[ev.detail.menuID].actionID;
        this.actionManager.doAction(action, {
            clear_breadcrumbs: true,
            menuID: ev.detail.menuID,
        });
    }
    /**
     * @private
     * @param {OdooEvent} ev
     * @param {integer} ev.detail.controllerID
     */
    _onBreadcrumbClicked(ev) {
        this.actionManager.restoreController(ev.detail.controllerID);
    }
    _onDialogClosed() {
        this.actionManager.doAction({type: 'ir.actions.act_window_close'});
    }
    /**
     * @private
     * @param {OdooEvent} ev
     * @param {Object} ev.detail
     */
    _onExecuteAction(ev) {
        this.actionManager.executeContextualActionTODONAME(ev.detail);
    }
    /**
     * @private
     * @param {OdooEvent} ev
     * @param {Object} ev.detail.state
     */
    _onPushState(ev) {
        if (!this.renderingInfo) {
            // Deal with that event only if we are not in a rendering cycle
            // i.e.: the rendering cycle will update the state at its end
            // Any event hapening in the meantime would be irrelevant
            this._updateState(ev.detail.state);
        }
    }
    /**
     * Displays a visual effect (for example, a rainbowMan0
     *
     * @private
     * @param {OdooEvent} ev
     * @param {Object} [ev.data] - key-value options to decide rainbowMan
     *   behavior / appearance
     */
    async _onShowEffect(ev) {
        if (!this.renderingInfo) {
            const data = ev.detail || {};
            const type = data.type || 'rainbow_man';
            if (type === 'rainbow_man') {
                if (this.env.session.show_effect) {
                    this.rainbowMan = await RainbowMan.display(data, {target: this.el, parent: this});
                } else {
                    // For instance keep title blank, as we don't have title in data
                    this._displayNotification({
                        title: "",
                        message: data.message,
                        sticky: false
                    });
                }
            } else {
                throw new Error('Unknown effect type: ' + type);
            }
        }
    }
    _onCloseRainbowMan() {
        this.rainbowMan = null;
    }
}
WebClient.components = { Action, Menu, DialogAction, ComponentAdapter };
WebClient.template = 'web.WebClient';

return WebClient;

});
