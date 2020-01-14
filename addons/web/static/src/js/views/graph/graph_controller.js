odoo.define('web.GraphController', function (require) {
"use strict";

/*---------------------------------------------------------
 * Odoo Graph view
 *---------------------------------------------------------*/

const AbstractController = require('web.AbstractController');
const { ComponentWrapper } = require('web.OwlCompatibility');
const DropdownMenu = require('web.DropdownMenu');
const { DEFAULT_INTERVAL, INTERVAL_OPTIONS } = require('web.controlPanelParameters');
const { qweb } = require('web.core');

var GraphController = AbstractController.extend({
    custom_events: _.extend({}, AbstractController.prototype.custom_events, {
        item_selected: '_onItemSelected',
    }),

    /**
     * @override
     * @param {Widget} parent
     * @param {GraphModel} model
     * @param {GraphRenderer} renderer
     * @param {Object} params
     * @param {string[]} params.measures
     * @param {boolean} params.isEmbedded
     * @param {string[]} params.groupableFields,
     */
    init: function (parent, model, renderer, params) {
        this._super.apply(this, arguments);
        this.measures = params.measures;
        // this parameter condition the appearance of a 'Group By'
        // button in the control panel owned by the graph view.
        this.isEmbedded = params.isEmbedded;

        // this parameter determines what is the list of fields
        // that may be used within the groupby menu available when
        // the view is embedded
        this.groupableFields = params.groupableFields;
    },
    /**
     * @override
     */
    start: function () {
        this.$el.addClass('o_graph_controller');
        return this._super.apply(this, arguments);
    },
    /**
     * @todo check if this can be removed (mostly duplicate with
     * AbstractController method)
     */
    destroy: function () {
        if (this.$buttons) {
            // remove jquery's tooltip() handlers
            this.$buttons.find('button').off().tooltip('dispose');
        }
        this._super.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Returns the current mode, measure and groupbys, so we can restore the
     * view when we save the current state in the search view, or when we add it
     * to the dashboard.
     *
     * @override
     * @returns {Object}
     */
    getOwnedQueryParams: function () {
        var state = this.model.get();
        return {
            context: {
                graph_measure: state.measure,
                graph_mode: state.mode,
                graph_groupbys: state.groupBy,
            }
        };
    },
    /**
     * Render the buttons according to the GraphView.buttons and
     * add listeners on it.
     * Set this.$buttons with the produced jQuery element
     *
     * @param {jQuery} [$node] a jQuery node where the rendered buttons should
     * be inserted $node may be undefined, in which case the GraphView does
     * nothing
     */
    renderButtons: function ($node) {
        var context = {
            measures: _.sortBy(_.pairs(_.omit(this.measures, '__count__')), function (x) { return x[1].string.toLowerCase(); }),
        };
        this.$buttons = $(qweb.render('GraphView.buttons', context));
        this.$measureList = this.$buttons.find('.o_graph_measures_list');
        this.$buttons.find('button').tooltip();
        this.$buttons.click(this._onButtonClick.bind(this));
        if ($node) {
            if (this.isEmbedded) {
                const self = this;
                const activeGroupBys = this.model.get().groupBy;
                this.groupByMenuWrapper = new ComponentWrapper(this, DropdownMenu, {
                    title: "Group By",
                    items: this._getGroupBys(activeGroupBys),
                });
                this.groupByMenuWrapper.mount(this.$buttons[0]).then(() => {
                    const groupByButton = self.$buttons[0].querySelector('.o_dropdown_toggler_btn');
                    groupByButton.classList.remove('o_dropdown_toggler_btn', 'btn-secondary');
                    groupByButton.classList.add('btn-outline-secondary');
                });
            }
            this.$buttons.appendTo($node);
        }
    },
    /**
     * Makes sure that the buttons in the control panel matches the current
     * state (so, correct active buttons and stuff like that).
     *
     * @override
     */
    updateButtons: function () {
        if (!this.$buttons) {
            return;
        }
        var state = this.model.get();
        this.$buttons.find('.o_graph_button').removeClass('active');
        this.$buttons
            .find('.o_graph_button[data-mode="' + state.mode + '"]')
            .addClass('active');
        this.$buttons
            .find('.o_graph_button[data-mode="stack"]')
            .data('stacked', state.stacked)
            .toggleClass('active', state.stacked)
            .toggleClass('o_hidden', state.mode !== 'bar');
        _.each(this.$measureList.find('.dropdown-item'), function (item) {
            var $item = $(item);
            $item.toggleClass('selected', $item.data('field') === state.measure);
        });
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Returns the items used by the Group By menu in embedded mode.
     *
     * @private
     * @param {string[]} activeGroupBys
     * @returns {Object[]}
     */
    _getGroupBys(activeGroupBys) {
        const normalizedGroupBys = this._normalizeActiveGroupBys(activeGroupBys);
        const groupBys = Object.keys(this.groupableFields).map(fieldName => {
            const field = this.groupableFields[fieldName];
            const groupByActivity = normalizedGroupBys.filter(gb => gb.fieldName === fieldName);
            const groupBy = {
                id: fieldName,
                isActive: Boolean(groupByActivity.length),
                description: field.string,
            };
            if (['date', 'datetime'].includes(field.type)) {
                groupBy.hasOptions = true;
                const activeOptionIds = groupByActivity.map(gb => gb.interval);
                groupBy.options = Object.values(INTERVAL_OPTIONS).map(o => {
                    return Object.assign({}, o, { isActive: activeOptionIds.includes(o.optionId) });
                });
            }
            return groupBy;
        }).sort((gb1, gb2) => {
            return gb1.description.localeCompare(gb2.description);
        })
        return groupBys;
    },

    /**
     * This method puts the active groupBys in a convenient form.
     *
     * @private
     * @param {string[]} activeGroupBys
     * @returns {Object[]} normalizedGroupBys
     */
    _normalizeActiveGroupBys(activeGroupBys) {
        return activeGroupBys.map(groupBy => {
            const fieldName = groupBy.split(':')[0];
            const field = this.groupableFields[fieldName];
            const normalizedGroupBy = { fieldName };
            if (['date', 'datetime'].includes(field.type)) {
                normalizedGroupBy.interval = groupBy.split(':')[1] || DEFAULT_INTERVAL;
            }
            return normalizedGroupBy;
        });
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Do what need to be done when a button from the control panel is clicked.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onButtonClick: function (ev) {
        var $target = $(ev.target);
        var field;
        if ($target.hasClass('o_graph_button')) {
            if (_.contains(['bar','line', 'pie'], $target.data('mode'))) {
                this.update({ mode: $target.data('mode') });
            } else if ($target.data('mode') === 'stack') {
                this.update({ stacked: !$target.data('stacked') });
            }
        } else if ($target.parents('.o_graph_measures_list').length) {
            ev.preventDefault();
            field = $target.data('field');
            this.update({ measure: field });
        }
    },

    /**
     * @private
     * @param {OdooEvent} ev
     */
    _onItemSelected(ev) {
        if (!this.isEmbedded) {
            return;
        }
        const fieldName = ev.data.item.id;
        const optionId = ev.data.option && ev.data.option.id;
        const activeGroupBys = this.model.get().groupBy;
        if (optionId) {
            const normalizedGroupBys = this._normalizeActiveGroupBys(activeGroupBys);
            const index = normalizedGroupBys.findIndex(ngb =>
                ngb.fieldName === fieldName && ngb.interval === optionId);
            if (index === -1) {
                activeGroupBys.push(fieldName + ':' + optionId);
            } else {
                activeGroupBys.splice(index, 1);
            }
        } else {
            const groupByFieldNames = activeGroupBys.map(gb => gb.split(':')[0]);
            const indexOfGroupby = groupByFieldNames.indexOf(fieldName);
            if (indexOfGroupby === -1) {
                activeGroupBys.push(fieldName);
            } else {
                activeGroupBys.splice(indexOfGroupby, 1);
            }
        }
        this.update({ groupBy: activeGroupBys });
        this.groupByMenuWrapper.update({
            items: this._getGroupBys(activeGroupBys),
        });
    },
});

return GraphController;

});
