odoo.define("web.ModelFieldSelector", function (require) {
"use strict";

const core = require("web.core");

/**
 * Field Selector Cache - TODO Should be improved to use external cache ?
 * - Stores fields per model used in field selector
 * @see ModelFieldSelector.getModelFields
 */
const modelFieldsCache = {
    cache: {},
    fetching: {},
};
core.bus.on('clear_cache', null, function () {
    modelFieldsCache.cache = {};
    modelFieldsCache.fetching = {};
});

const { Component } = owl;

/**
 * Allows to transform a mapping field name -> field info in an array of the
 * field infos, sorted by field user name ("string" value). The field infos in
 * the final array contain an additional key "name" with the field name.
 *
 * @param {Object} fields the mapping field name -> field info
 * @param {string} model
 * @returns {Object[]} the field infos sorted by field[this.props.order]
 *      (field infos contain additional keys "model" and "name" with the
 *      field name).
 */
function sortFields(fields, model, order) {
    return Object.entries(fields)
        .map(([name, field]) =>
            Object.assign({ name, model }, field)
        )
        .sort((a, b) =>
            a[order] > b[order] ? 1 :
            a[order] < b[order] ? -1 :
            0
        );
}

/**
 * The ModelFieldSelector widget can be used to display/select a particular
 * field chain from a given model.
 */
class ModelFieldSelector extends Component {
    // events: {},
    // editionEvents: {
    //     // Handle popover opening and closing
    //     "focusin": "_onFocusIn",
    //     "focusout": "_onFocusOut",
    //     "click .o_field_selector_close": "_onCloseClick",

    //     // Handle popover field navigation
    //     "click .o_field_selector_prev_page": "_onPrevPageClick",
    //     "click .o_field_selector_next_page": "_onNextPageClick",
    //     "click li.o_field_selector_select_button": "_onLastFieldClick",

    //     // Handle a direct change in the debug input
    //     "change input.o_field_selector_debug": "_onDebugInputChange",

    //     // Handle a change in the search input
    //     "keyup .o_field_selector_search > input": "_onSearchInputChange",

    //     // Handle keyboard and mouse navigation to build the field chain
    //     "mouseover li.o_field_selector_item": "_onItemHover",
    //     "keydown": "_onKeydown",
    // },
    /**
     * @constructor
     * The ModelFieldSelector requires a model and a field chain to work with.
     *
     * @param {string} model - the model name (ev.g. "res.partner")
     * @param {string[]} chain - list of the initial field chain parts
     * @param {Object} [props] - some key-value props
     * @param {string} [props.order='string']
     *                 an ordering key for displayed fields
     * @param {boolean} [props.readonly=true] - true if should be readonly
     * @param {function} [props.filter]
     *                 a function to filter the fetched fields
     * @param {Object} [props.filters]
     *                 some key-value props to filter the fetched fields
     * @param {boolean} [props.filters.searchable=true]
     *                  true if only the searchable fields have to be used
     * @param {Object[]} [props.fields=null]
     *                   the list of fields info to use when no relation has
     *                   been followed (null indicates the widget has to request
     *                   the fields itself)
     * @param {boolean|function} [props.followRelations=true]
     *                  true if can follow relation when building the chain
     * @param {boolean} [props.showSearchInput=true]
     *                  false to hide a search input to filter displayed fields
     * @param {boolean} [props.debugMode=false]
     *                  true if the widget is in debug mode, false otherwise
     */
    constructor() {
        super(...arguments);

        this.props.filters = Object.assign({
            searchable: true,
        }, this.props.filters);

        this.pages = [];
        this.lines = [];
        this.dirty = false;

        // if (!this.props.readonly) {
        //     Object.assign(this.events, this.editionEvents);
        // }

        this.searchValue = '';
    }

    /**
     * @see Widget.willStart()
     * @returns {Promise}
     */
    async willStart() {
        return this._prefill();
    }

    /**
     * @see Widget.start
     * @returns {Promise}
     */
    mounted() {
        this.value = this.el.querySelector(".o_field_selector_value");
        this.popover = this.el.querySelector(".o_field_selector_popover");
        this.input = this.popover.querySelector(".o_field_selector_popover_footer > input");
        this.searchInput = this.popover.querySelector(".o_field_selector_search > input");
        this.valid = this.el.querySelector(".o_field_selector_warning");

        this.patched();
    }

    patched() {
        this.valid.classList.toggle('d-none', !!this.isValid());

        // Adapt the popover content
        const page = this.pages[this.pages.length - 1];
        let title = "";
        if (this.pages.length > 1) {
            const comaprison = this.props.chain.length === this.pages.length ?
                this.props.chain[this.props.chain.length - 2] :
                this.props.chain[this.props.chain.length - 1];
            const prevField = this.pages[this.pages.length - 2].find(p => p.name === comaprison);
            if (prevField) {
                title = prevField.string;
            }
        }
        this.el.querySelector(".o_field_selector_popover_header .o_field_selector_title").innerText = title;

        this.lines = page.filter(this.props.filter);
        if (this.searchValue) {
            const matches = fuzzy.filter(this.searchValue, lines.map(l => l.string));
            this.lines = matches.map(m => lines[m.index]);
        }

        if (this.input) {
            this.input.value = this.props.chain.join(".");
        }
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Returns the field information selected by the field chain.
     *
     * @returns {Object}
     */
    getSelectedField() {
        return this.pages[this.props.chain.length - 1].find(
            f => f.name === this.props.chain[this.props.chain.length - 1]
        );
    }

    /**
     * Indicates if the field chain is valid. If the field chain has not been
     * processed yet (the widget is not ready), this method will return
     * undefined.
     *
     * @returns {boolean}
     */
    isValid() {
        return this.valid;
    }

    /**
     * Saves a new field chain (array) and re-render.
     *
     * @param {string[]} chain - the new field chain
     * @returns {Promise} resolved once the re-rendering is finished
     */
    async setChain(chain) {
        if (_.isEqual(chain, this.props.chain)) {
            return Promise.resolve();
        }

        this.props.chain = chain;
        await this._prefill();
        this.patched();
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Adds a field name to the current field chain and marks it as dirty.
     *
     * @private
     * @param {string} fieldName - the new field name to add at the end of the
     *                           current field chain
     */
    _addChainNode(fieldName) {
        this.dirty = true;
        this.props.chain = this.props.chain.slice(0, this.pages.length - 1);
        this.props.chain.push(fieldName);

        this.searchValue = '';
        this.searchInput.value = '';
    }

    _followRelations() {
        if (this.props.followRelations instanceof Function) {
            return this.props.followRelations(...arguments);
        } else {
            return Boolean(this.props.followRelations);
        }
    }

    /**
     * Searches a field in the last page by its name.
     *
     * @private
     * @param {string} name - the name of the field to find
     * @returns {Object} the field data found in the last popover page thanks
     *                   to its name
     /*/
    _getLastPageField(name) {
        return this.pages[this.pages.length - 1].find(f => f.name === name);
    }

    /**
     * Adds a new page to the popover following the given field relation and
     * adapts the chain node according to this given field.
     *
     * @private
     * @param {Object} field - the field to add to the chain node
     */
    async _goToNextPage(field) {
        if (!_.isEqual(this._getLastPageField(field.name), field)) {
            return;
        }

        this._validate(true);
        this._addChainNode(field.name);
        await this._pushPageData(field.relation);
        this.patched();
    }

    /**
     * Removes the last page, adapts the field chain and displays the new
     * last page.
     *
     * @private
     */
    _goToPrevPage() {
        if (this.pages.length <= 0) {
            return;
        }

        this._validate(true);
        this._removeChainNode();
        if (this.pages.length > 1) {
            this.pages.pop();
        }
        this.patched();
    }

    /**
     * Closes the popover and marks the field as selected. If the field chain
     * changed, it notifies its parents. If not open, this does nothing.
     *
     * @private
     */
    _hidePopover() {
        if (!this._isOpen) {
            return;
        }

        this._isOpen = false;
        this.popover.classList.add('d-none');

        if (this.dirty) {
            this.dirty = false;
            this.trigger("field-chain-changed", { chain: this.props.chain });
        }
    }

    /**
     * Prepares the popover by filling its pages according to the current field
     * chain.
     *
     * @private
     * @returns {Promise} resolved once the whole field chain has been
     *                     processed
     */
    async _prefill() {
        this.pages = [];
        await this._pushPageData(this.props.model);
        this._validate(true);
        if (this.props.chain.length) {
            return this._processChain(this.props.chain.slice().reverse());
        }
    }

    async _processChain(chain) {
        const fieldName = chain.pop();
        const field = this._getLastPageField(fieldName);
        if (field && field.relation && chain.length > 0) { // Fetch next chain node if any and possible
            await this._pushPageData(field.relation);
            return this._processChain(chain);
        } else if (field && chain.length === 0) { // Last node fetched
            return;
        } else if (!field && ['0', '1'].includes(fieldName)) { // TRUE_LEAF or FALSE_LEAF
            this._validate(true);
        } else { // Wrong node chain
            this._validate(false);
        }
    }

    /**
     * Gets the fields of a particular model and adds them to a new last
     * popover page.
     *
     * @private
     * @param {string} model - the model name whose fields have to be fetched
     * @returns {Promise} resolved once the fields have been added
     */
    async _pushPageData(model) {
        let fields;
        if (this.props.model === model && this.props.fields) {
            fields = sortFields(this.props.fields, model, this.props.order);
        } else {
            fields = await this.constructor.getModelFields(model, this.rpc, {
                context: this.env.session.user_context,
                filters: this.props.filters,
                filterFn: this.props.filter,
                orderBy: this.props.order,
            });
        }
        this.pages.push(fields);
    }

    /**
     * Removes the last field name at the end of the current field chain and
     * marks it as dirty.
     *
     * @private
     */
    _removeChainNode() {
        this.dirty = true;
        this.props.chain = this.props.chain.slice(0, this.pages.length - 1);
        this.props.chain.pop();
    }

    /**
     * Selects the given field and adapts the chain node according to it.
     * It also closes the popover and so notifies the parents about the change.
     *
     * @param {Object} field - the field to select
     */
    _selectField(field) {
        if (!_.isEqual(this._getLastPageField(field.name), field)) {
            return;
        }

        this._validate(true);
        this._addChainNode(field.name);
        this.patched();
        this._hidePopover();
    }

    /**
     * Shows the popover to select the field chain. This assumes that the
     * popover has finished its rendering (fully rendered widget or resolved
     * deferred of @see setChain). If already open, this does nothing.
     *
     * @private
     */
    _showPopover() {
        if (this._isOpen) {
            return;
        }

        this._isOpen = true;
        this.popover.classList.remove('d-none');
    }

    /**
     * Toggles the valid status of the widget and display the error message if
     * it is not valid.
     *
     * @private
     * @param {boolean} valid - true if the widget is valid, false otherwise
     */
    _validate(valid) {
        this.valid = Boolean(valid);

        if (!this.valid) {
            this.do_warn(
                this.env._t("Invalid field chain"),
                this.env._t("The field chain is not valid. Did you maybe use a non-existing field name or followed a non-relational field?")
            );
        }
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Called when the widget is focused -> opens the popover
     */
    _onFocusIn() {
        clearTimeout(this._hidePopoverTimeout);
        this._showPopover();
    }

    /**
     * Called when the widget is blurred -> closes the popover
     */
    _onFocusOut() {
        this._hidePopoverTimeout = setTimeout(() => this._hidePopover(), 0);
    }

    /**
     * Called when the popover "cross" icon is clicked -> closes the popover
     */
    _onCloseClick() {
        this._hidePopover();
    }

    /**
     * Called when the popover "previous" icon is clicked -> removes last chain
     * node
     */
    _onPrevPageClick() {
        this._goToPrevPage();
    }

    /**
     * Called when a popover relation field button is clicked -> adds it to
     * the chain
     *
     * @param {MouseEvent} ev
     */
    _onNextPageClick(ev) {
        ev.stopPropagation();
        this._goToNextPage(this._getLastPageField(ev.currentTarget.dataset.name));
    }

    /**
     * Called when a popover non-relation field button is clicked -> adds it to
     * chain and closes the popover
     *
     * @param {MouseEvent} ev
     */
    _onLastFieldClick(ev) {
        this._selectField(this._getLastPageField(ev.currentTarget.dataset.name));
    }

    /**
     * Called when the debug input value is changed -> adapts the chain
     */
    async _onDebugInputChange() {
        const userChainStr = this.input.value;
        let userChain = userChainStr.split(".");
        if (!this.props.followRelations && userChain.length > 1) {
            this.do_warn(
                this.env._t("Relation not allowed"),
                this.env._t("You cannot follow relations for this field chain construction")
            );
            userChain = [userChain[0]];
        }
        await this.setChain(userChain);
        this.trigger("field-chain-changed", { chain: this.props.chain });
    }

    /**
     * Called when the search input value is changed -> adapts the popover
     */
    _onSearchInputChange() {
        this.searchValue = this.searchInput.value;
        this.patched();
    }

    /**
     * Called when a popover field button item is hovered -> toggles its
     * "active" status
     *
     * @param {Event} ev
     */
    _onItemHover(ev) {
        this.el.querySelector("li.o_field_selector_item").classList.remove("active");
        ev.currentTarget.classList.add("active");
    }

    /**
     * Called when the user uses the keyboard when the widget is focused
     * -> handles field keyboard navigation
     *
     * @param {Event} ev
     */
    _onKeydown(ev) {
        const popoverRect = this.popover.getBoundingClientRect();
        if (!popoverRect.width && !popoverRect.height) {
            return;
        }
        const inputHasFocus = this.input === document.activeElement;
        const searchInputHasFocus = this.searchInput === document.activeElement;

        switch (ev.key) {
            case 'ArrowUp':
            case 'ArrowDown':
                ev.preventDefault();
                const active = this.el.querySelector("li.o_field_selector_item.active");
                const selectors = [...active.parentNode.querySelectorAll('.o_field_selector_item')];
                const toIndex = selectors.indexOf(active) + (ev.key === 'ArrowDown' ? 1 : -1);
                const to = selectors[toIndex];
                if (to) {
                    active.classList.remove("active");
                    to.classList.add("active");
                    this.popover.focus();

                    const page = to.closest(".o_field_selector_page");
                    const fullHeight = page.offsetHeight;
                    const elPosition = to.style.top;
                    const elHeight = to.offsetHeight;
                    const currentScroll = page.scrollTop;
                    if (elPosition < 0) {
                        page.scrollTop = currentScroll - elHeight;
                    } else if (fullHeight < elPosition + elHeight) {
                        page.scrollTop = currentScroll + elHeight;
                    }
                }
                break;
            case 'ArrowRight':
                if (inputHasFocus) {
                    break;
                }
                ev.preventDefault();
                const name = this.el.querySelector("li.o_field_selector_item.active").dataset.name;
                if (name) {
                    const field = this._getLastPageField(name);
                    if (field.relation) {
                        this._goToNextPage(field);
                    }
                }
                break;
            case 'ArrowLeft':
                if (inputHasFocus) {
                    break;
                }
                ev.preventDefault();
                this._goToPrevPage();
                break;
            case 'Escape':
                ev.stopPropagation();
                this._hidePopover();
                break;
            case 'Enter':
                if (inputHasFocus || searchInputHasFocus) {
                    break;
                }
                ev.preventDefault();
                this._selectField(this._getLastPageField(this.el.querySelector("li.o_field_selector_item.active").dataset.name));
                break;
        }
    }

    /**
     * Searches the cache for the given model fields, according to the given
     * filter. If the cache does not know about the model, the cache is updated.
     *
     * @static
     * @param {string} model
     * @param {Object} [params]
     * @param {Object} [params.context={}]
     * @param {Function} [params.filterFn=f(true)]
     * @param {Object} [params.filters={searchable:true}]
     * @param {string} [params.orderBy='string']
     * @returns {Object[]} a list of the model fields info, sorted by field
     *                     non-technical names
     */
    static async getModelFields(model, rpc, params = {}) {
        params = Object.assign({
            context: {},
            filterFn: () => true,
            filters: { searchable: true },
            orderBy: 'string',
        }, params);
        if (!modelFieldsCache.cache[model]) {
            if (!modelFieldsCache.fetching[model]) {
                modelFieldsCache.fetching[model] = rpc({
                    args: [
                        false,
                        ["store", "searchable", "type", "string", "relation", "selection", "related"],
                    ],
                    model: model,
                    method: 'fields_get',
                    context: params.context,
                });
            }
            const fields = await modelFieldsCache.fetching[model];
            modelFieldsCache.cache[model] = sortFields(fields, model, params.orderBy);
        }
        return modelFieldsCache.cache[model].filter(
            f => (!params.filters.searchable || f.searchable) && params.filterFn(f)
        );
    }

    static async getField(chain, model, rpc) {
        const fieldName  = chain.shift();
        const fields = await this.getModelFields(model, rpc);
        const field = fields.find(f => f.name === fieldName);
        if (!field || (Boolean(field.relation) !== Boolean(chain.length))) {
            throw new Error("Invalid chain/model combination");
        }
        return field.relation ? this.getField(chain, field.relation, rpc) : field;
    }
}
ModelFieldSelector.defaultProps = {
    debugMode: false,
    filter: () => true,
    filters: {},
    followRelations: true,
    order: 'string',
    readonly: true,
    showSearchInput: true,
};
ModelFieldSelector.props = {
    chain: Array,
    debugMode: Boolean,
    fields: { type: Object, optional: 1 },
    filter: Function,
    filters: Object,
    followRelations: Boolean,
    model: String,
    order: String,
    readonly: Boolean,
    showSearchInput: Boolean,
};
ModelFieldSelector.template = 'ModelFieldSelector';

return ModelFieldSelector;
});
