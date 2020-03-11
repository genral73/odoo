odoo.define('website_sale.add_product', function (require) {
'use strict';

var core = require('web.core');
var wUtils = require('website.utils');
var WebsiteNewMenu = require('website.newMenu');

var _t = core._t;

WebsiteNewMenu.include({
    actions: _.extend({}, WebsiteNewMenu.prototype.actions || {}, {
        new_product: '_createNewProduct',
    }),

    //--------------------------------------------------------------------------
    // Actions
    //--------------------------------------------------------------------------

    /**
     * Asks the user information about a new product to create, then creates it
     * and redirects the user to this new product.
     *
     * @private
     * @returns {Promise} Unresolved if there is a redirection
     */
    _createNewProduct: function () {
        var self = this;
        return wUtils.prompt({
            id: "editor_new_product",
            window_title: _t("New Product"),
            input: _t("Name"),
        }).then(function (result) {
            if (!result.val) {
                return;
            }
            return self._rpc({
                route: '/shop/add_product',
                params: {
                    name: result.val,
                },
            }).then(function (url) {
                window.location.href = url;
                return new Promise(function () {});
            });
        });
    },
});
});

//==============================================================================

odoo.define('website_sale.editor', function (require) {
'use strict';

var options = require('web_editor.snippets.options');
var publicWidget = require('web.public.widget');
const {isCSSColor} = require('web.ColorpickerDialog');
const {Class: EditorMenuBar} = require('web_editor.editor');

EditorMenuBar.include({
    custom_events: Object.assign(EditorMenuBar.prototype.custom_events, {
        get_ribbons: '_onGetRibbons',
        delete_ribbon: '_onDeleteRibbon',
        set_ribbon: '_onSetRibbon',
        set_product_ribbon: '_onSetProductRibbon',
    }),
    /**
     * @override
     */
    async willStart() {
        const _super = this._super.bind(this);
        let ribbons = [];
        if (window.location.pathname === '/shop') {
            ribbons = await this._rpc({
                model: 'product.ribbon',
                method: 'search_read',
                fields: ['id', 'name', 'color', 'text_color', 'html_class'],
            });
        }
        this.ribbons = Object.fromEntries(ribbons.map(ribbon => [ribbon.id, ribbon]));
        this.originalRibbons = Object.assign({}, this.ribbons);
        this.productTemplatesRibbons = [];
        return _super(...arguments);
    },
    /**
     * @override
     */
    async save() {
        const _super = this._super.bind(this);
        await this._saveRibbons();
        return _super(...arguments);
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Saves the ribbons in the database.
     *
     * @private
     */
    async _saveRibbons() {
        if (window.location.pathname !== '/shop') {
            return;
        }
        const originalIds = Object.keys(this.originalRibbons).map(id => parseInt(id));
        const currentIds = Object.keys(this.ribbons).map(id => parseInt(id));

        const created = Object.values(this.ribbons).filter(ribbon => !originalIds.includes(ribbon.id));
        const deletedIds = originalIds.filter(id => !currentIds.includes(id));
        const modified = Object.values(this.ribbons).filter(ribbon => {
            if (created.includes(ribbon.id)) {
                return false;
            }
            for (const entry of Object.entries(ribbon)) {
                const [key, value] = entry;
                if (value !== (this.originalRibbons[key])) {
                    return false;
                }
            }
            return true;
        });

        let createRibbons = Promise.resolve([]);
        if (created.length > 0) {
            createRibbons = this._rpc({
                method: 'create',
                model: 'product.ribbon',
                args: [created.map(ribbon => {
                    ribbon = Object.assign({}, ribbon);
                    delete ribbon.id;
                    return ribbon;
                })],
            });
        }

        const editRibbons = Promise.all(modified.map(ribbon => this._rpc({
            method: 'write',
            model: 'product.ribbon',
            args: [[ribbon.id], ribbon],
        })));

        let deleteRibbons = Promise.resolve(true);
        if (deletedIds.length > 0) {
            deleteRibbons = this._rpc({
                method: 'unlink',
                model: 'product.ribbon',
                args: [deletedIds],
            });
        }

        const [createdRibbonIds] = await Promise.all([createRibbons, editRibbons, deleteRibbons]);
        const localToServer = Object.assign(
            this.ribbons,
            Object.fromEntries(created.map((ribbon, index) => [ribbon.id, {id: createdRibbonIds[index]}])),
            {'false': {id: false}},
        );

        // Building the final template to ribbon-id map
        const finalTemplateRibbons = this.productTemplatesRibbons.reduce((acc, {templateId, ribbonId}) => {
            acc[templateId] = ribbonId;
            return acc;
        }, {});
        // Inverting the relationship so that we have all templates that have the same ribbon to reduce RPCs
        const ribbonTemplates = Object.entries(finalTemplateRibbons).reduce((acc, [templateId, ribbonId]) => {
            acc[ribbonId] = [parseInt(templateId)].concat(acc[ribbonId] || []);
            return acc;
        }, {});
        const setProductTemplateRibbons = Object.entries(ribbonTemplates)
            // If the ribbonId that the template had no longer exists, remove the ribbon (id = false)
            .map(([ribbonId, templateIds]) =>
                currentIds.includes(parseInt(ribbonId)) ? [ribbonId, templateIds] : [false, templateIds]
            ).map(([ribbonId, templateIds]) => this._rpc({
                method: 'write',
                model: 'product.template',
                args: [templateIds, {'website_ribbon_id': localToServer[ribbonId].id}],
            }));
        return Promise.all(setProductTemplateRibbons);
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Returns a copy of this.ribbons through a callback.
     *
     * @private
     */
    _onGetRibbons(ev) {
        ev.data.callback(Object.assign({}, this.ribbons));
    },
    /**
     * Deletes a ribbon.
     *
     * @private
     */
    _onDeleteRibbon(ev) {
        delete this.ribbons[ev.data.id];
    },
    /**
     * Sets a ribbon;
     *
     * @private
     */
    _onSetRibbon(ev) {
        const {ribbon} = ev.data;
        this.ribbons[ribbon.id] = ribbon;
    },
    /**
     * Sets which ribbon is used by a product template.
     *
     * @private
     */
    _onSetProductRibbon(ev) {
        const {templateId, ribbonId} = ev.data;
        this.productTemplatesRibbons.push({templateId, ribbonId});
    },
});

publicWidget.registry.websiteSaleCurrency = publicWidget.Widget.extend({
    selector: '.oe_website_sale',
    disabledInEditableMode: false,
    edit_events: {
        'click .oe_currency_value:o_editable': '_onCurrencyValueClick',
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onCurrencyValueClick: function (ev) {
        $(ev.currentTarget).selectContent();
    },
});

function reload() {
    if (window.location.href.match(/\?enable_editor/)) {
        window.location.reload();
    } else {
        window.location.href = window.location.href.replace(/\?(enable_editor=1&)?|#.*|$/, '?enable_editor=1&');
    }
}

options.registry.WebsiteSaleGridLayout = options.Class.extend({

    /**
     * @override
     */
    start: function () {
        this.ppg = parseInt(this.$target.closest('[data-ppg]').data('ppg'));
        this.ppr = parseInt(this.$target.closest('[data-ppr]').data('ppr'));
        return this._super.apply(this, arguments);
    },
    /**
     * @override
     */
    onFocus: function () {
        var listLayoutEnabled = this.$target.closest('#products_grid').hasClass('o_wsale_layout_list');
        this.$el.filter('.o_wsale_ppr_submenu').toggleClass('d-none', listLayoutEnabled);
    },

    //--------------------------------------------------------------------------
    // Options
    //--------------------------------------------------------------------------

    /**
     * @see this.selectClass for params
     */
    setPpg: function (previewMode, widgetValue, params) {
        const ppg = parseInt(widgetValue);
        if (!ppg || ppg < 1) {
            return false;
        }
        this.ppg = ppg;
        return this._rpc({
            route: '/shop/change_ppg',
            params: {
                'ppg': ppg,
            },
        }).then(() => reload());
    },
    /**
     * @see this.selectClass for params
     */
    setPpr: function (previewMode, widgetValue, params) {
        this.ppr = parseInt(widgetValue);
        this._rpc({
            route: '/shop/change_ppr',
            params: {
                'ppr': this.ppr,
            },
        }).then(reload);
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @override
     */
    _computeWidgetState: function (methodName, params) {
        switch (methodName) {
            case 'setPpg': {
                return this.ppg;
            }
            case 'setPpr': {
                return this.ppr;
            }
        }
        return this._super(...arguments);
    },
});

options.registry.WebsiteSaleProductsItem = options.Class.extend({
    events: _.extend({}, options.Class.prototype.events || {}, {
        'mouseenter .o_wsale_soptions_menu_sizes table': '_onTableMouseEnter',
        'mouseleave .o_wsale_soptions_menu_sizes table': '_onTableMouseLeave',
        'mouseover .o_wsale_soptions_menu_sizes td': '_onTableItemMouseEnter',
        'click .o_wsale_soptions_menu_sizes td': '_onTableItemClick',
    }),

    /**
     * @override
     */
    willStart: function () {
        this.ppr = this.$target.closest('[data-ppr]').data('ppr');
        this.productTemplateID = parseInt(this.$target.find('[data-oe-model="product.template"]').data('oe-id'));

        return this._super(...arguments);
    },
    /**
     * @override
     */
    start: function () {
        this.$ribbon = this.$('.o_ribbon').clone().addClass('d-none o_wsale_ribbon_dummy').appendTo(this.$target);
    },
    /**
     * @override
     */
    onFocus: function () {
        var listLayoutEnabled = this.$target.closest('#products_grid').hasClass('o_wsale_layout_list');
        this.$el.find('.o_wsale_soptions_menu_sizes')
            .toggleClass('d-none', listLayoutEnabled);
        // Ribbons may have been edited or deleted in another products' option, need to make sure they're up to date
        this.rerender = true;
    },

    //--------------------------------------------------------------------------
    // Options
    //--------------------------------------------------------------------------

    /**
     * @see this.selectClass for params
     */
    async setRibbon(previewMode, widgetValue, params) {
        this.$target[0].dataset.ribbonId = widgetValue;
        this.trigger_up('set_product_ribbon', {
            templateId: this.productTemplateID,
            ribbonId: widgetValue || false,
        });
        const ribbon = this.ribbons[widgetValue] || {name: '', color: '', text_color: '', html_class: ''};
        const $ribbons = $(`[data-ribbon-id="${widgetValue}"] .o_ribbon:not(.o_wsale_ribbon_dummy)`);
        $ribbons.text(ribbon.name);
        $ribbons.attr('class', 'o_ribbon');

        if (!ribbon.html_class) {
            $ribbons.css('background-color', ribbon.color);
        } else {
            $ribbons.addClass(ribbon.html_class);
            $ribbons.css('background-color', '');
        }
        $ribbons.css('color', ribbon.text_color);

        if (!this.ribbons[widgetValue]) {
            $(`[data-ribbon-id="${widgetValue}"]`).each((index, product) => delete product.dataset.ribbonId);
        }
        this.$ribbon.remove();
        this.$ribbon = this.$('.o_ribbon').clone().addClass('d-none o_wsale_ribbon_dummy').appendTo(this.$target);
    },
    /**
     * @see this.selectClass for params
     */
    editRibbon(previewMode, widgetValue, params) {
        this.saveMethod = 'modify';
        this._toggleEditingUI(true);
    },
    /**
     * @see this.selectClass for params
     */
    createRibbon(previewMode, widgetValue, params) {
        this.saveMethod = 'create';
        this.$ribbon.text('Ribbon text');
        this.$ribbon.addClass('bg-primary');
        this._toggleEditingUI(true);
    },
    /**
     * @see this.selectClass for params
     */
    async deleteRibbon(previewMode, widgetValue, params) {
        const {ribbonId} = this.$target[0].dataset;
        this.trigger_up('delete_ribbon', {id: ribbonId});
        await this._rerenderXML();
        await this.setRibbon(false, '');
    },
    /**
     * @see this.selectClass for params
     */
    async saveRibbon(previewMode, widgetValue, params) {
        const ribbon = {
            'name': this.$ribbon.text(),
            'color': this.$ribbon[0].style.backgroundColor,
            'text_color': this.$ribbon[0].style.color,
            'html_class': this.$ribbon.attr('class').replace(/(d-none)|(o_wsale_ribbon_dummy)|(o_ribbon)/g, '').trim(),
        };
        ribbon.id = this.saveMethod === 'modify' ? this.$target[0].dataset.ribbonId : Date.now();
        this.trigger_up('set_ribbon', {ribbon: ribbon});
        await this._rerenderXML();
        await this.setRibbon(false, ribbon.id);
    },
    /**
     * @see this.selectClass for params
     */
    setRibbonColor(previewMode, widgetValue, params) {
        this.selectStyle.call(Object.assign({}, this, {$target: this.$ribbon}), previewMode, widgetValue, params);
    },
    /**
     * @see this.selectClass for params
     */
    setRibbonName(previewMode, widgetValue, params) {
        this.$ribbon.text(widgetValue);
    },
    /**
     * @see this.selectClass for params
     */
    changeSequence: function (previewMode, widgetValue, params) {
        this._rpc({
            route: '/shop/change_sequence',
            params: {
                id: this.productTemplateID,
                sequence: widgetValue,
            },
        }).then(reload);
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @override
     */
    updateUI: async function () {
        await this._super.apply(this, arguments);

        var sizeX = parseInt(this.$target.attr('colspan') || 1);
        var sizeY = parseInt(this.$target.attr('rowspan') || 1);

        var $size = this.$el.find('.o_wsale_soptions_menu_sizes');
        $size.find('tr:nth-child(-n + ' + sizeY + ') td:nth-child(-n + ' + sizeX + ')')
             .addClass('selected');

        // Adapt size array preview to fit ppr
        $size.find('tr td:nth-child(n + ' + parseInt(this.ppr + 1) + ')').hide();
        if (this.rerender) {
            this.rerender = false;
            return this._rerenderXML();
        }
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @override
     */
    async _renderCustomXML(uiFragment) {
        const $select = $(uiFragment.querySelector('.o_wsale_ribbon_select'));
        this.ribbons = await new Promise(resolve => this.trigger_up('get_ribbons', {callback: resolve}));
        Object.values(this.ribbons).forEach(ribbon => {
            $select.append(`<we-button data-set-ribbon="${ribbon.id}">${ribbon.name}</we-button>`);
        });
    },
    /**
     * @override
     */
    async _computeWidgetState(methodName, params) {
        switch (methodName) {
            case 'setRibbon':
                return this.$target.attr('data-ribbon-id') || '';
            case 'setRibbonColor':
                return this._super.call(Object.assign({}, this, {$target: this.$ribbon}), 'selectStyle', params);
            case 'setRibbonName':
                return this.$ribbon.text();
        }
        return this._super(methodName, params);
    },
    /**
     * Toggles the UI mode between select and create/edit mode.
     *
     * @private
     * @param {Boolean} state true to activate editing UI, false to deactivate.
     */
    _toggleEditingUI(state) {
        this.$el.find('[data-name="ribbon_options"]').toggleClass('d-none', state);
        this.$el.find('[data-name="ribbon_customize_opt"]').toggleClass('d-none', !state);
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onTableMouseEnter: function (ev) {
        $(ev.currentTarget).addClass('oe_hover');
    },
    /**
     * @private
     */
    _onTableMouseLeave: function (ev) {
        $(ev.currentTarget).removeClass('oe_hover');
    },
    /**
     * @private
     */
    _onTableItemMouseEnter: function (ev) {
        var $td = $(ev.currentTarget);
        var $table = $td.closest("table");
        var x = $td.index() + 1;
        var y = $td.parent().index() + 1;

        var tr = [];
        for (var yi = 0; yi < y; yi++) {
            tr.push("tr:eq(" + yi + ")");
        }
        var $selectTr = $table.find(tr.join(","));
        var td = [];
        for (var xi = 0; xi < x; xi++) {
            td.push("td:eq(" + xi + ")");
        }
        var $selectTd = $selectTr.find(td.join(","));

        $table.find("td").removeClass("select");
        $selectTd.addClass("select");
    },
    /**
     * @private
     */
    _onTableItemClick: function (ev) {
        var $td = $(ev.currentTarget);
        var x = $td.index() + 1;
        var y = $td.parent().index() + 1;
        this._rpc({
            route: '/shop/change_size',
            params: {
                id: this.productTemplateID,
                x: x,
                y: y,
            },
        }).then(reload);
    },
});
});
