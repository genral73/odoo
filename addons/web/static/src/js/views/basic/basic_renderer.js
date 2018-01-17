odoo.define('web.BasicRenderer', function (require) {
"use strict";

/**
 * The BasicRenderer is an abstract class designed to share code between all
 * views that uses a BasicModel. The main goal is to keep track of all field
 * widgets, and properly destroy them whenever a rerender is done. The widgets
 * and modifiers updates mechanism is also shared in the BasicRenderer.
 */
var AbstractRenderer = require('web.AbstractRenderer');
var config = require('web.config');
var core = require('web.core');
var dom = require('web.dom');
var widgetRegistry = require('web.widget_registry');

var qweb = core.qweb;

var BasicRenderer = AbstractRenderer.extend({
    custom_events: {
        navigation_move: '_onNavigationMove',
        set_last_tabindex: '_onSetLastTabindex',
    },
    /**
     * Basic renderers implements the concept of "mode", they can either be in
     * readonly mode or editable mode.
     *
     * @override
     */
    init: function (parent, state, params) {
        this._super.apply(this, arguments);
        this.activeActions = params.activeActions;
        this.viewType = params.viewType;
        this.mode = params.mode || 'readonly';
        this.lastTabindex = 0;
    },
    /**
     * This method has two responsabilities: find every invalid fields in the
     * current view, and making sure that they are displayed as invalid, by
     * toggling the o_form_invalid css class. It has to be done both on the
     * widget, and on the label, if any.
     *
     * @param {string} recordID
     * @returns {string[]} the list of invalid field names
     */
    canBeSaved: function (recordID) {
        var self = this;
        var invalidFields = [];
        _.each(this.allFieldWidgets[recordID], function (widget) {
            var canBeSaved = self._canWidgetBeSaved(widget);
            if (!canBeSaved) {
                invalidFields.push(widget.name);
            }
            widget.$el.toggleClass('o_field_invalid', !canBeSaved);
        });
        return invalidFields;
    },
    /**
     * Calls 'commitChanges' on all field widgets, so that they can notify the
     * environment with their current value (useful for widgets that can't
     * detect when their value changes or that have to validate their changes
     * before notifying them).
     *
     * @param {string} recordID
     * @return {Deferred}
     */
    commitChanges: function (recordID) {
        var defs = _.map(this.allFieldWidgets[recordID], function (widget) {
            return widget.commitChanges();
        });
        return $.when.apply($, defs);
    },
    /**
     * Updates the internal state of the renderer to the new state. By default,
     * this also implements the recomputation of the modifiers and their
     * application to the DOM and the reset of the field widgets if needed.
     *
     * In case the given record is not found anymore, a whole re-rendering is
     * completed (possible if a change in a record caused an onchange which
     * erased the current record).
     *
     * We could always rerender the view from scratch, but then it would not be
     * as efficient, and we might lose some local state, such as the input focus
     * cursor, or the scrolling position.
     *
     * @param {Object} state
     * @param {string} id
     * @param {string[]} fields
     * @param {OdooEvent} ev
     * @returns {Deferred<AbstractField[]>} resolved with the list of widgets
     *                                      that have been reset
     */
    confirmChange: function (state, id, fields, ev) {
        this.state = state;

        var record = state.id === id ? state : _.findWhere(state.data, {id: id});
        if (!record) {
            return this._render().then(_.constant([]));
        }

        var defs = [];

        // Reset all the field widgets that are marked as changed and the ones
        // which are configured to always be reset on any change
        var resetWidgets = [];
        _.each(this.allFieldWidgets[id], function (widget) {
            var fieldChanged = _.contains(fields, widget.name);
            if (fieldChanged || widget.resetOnAnyFieldChange) {
                defs.push(widget.reset(record, ev, fieldChanged));
                resetWidgets.push(widget);
            }
        });

        // The modifiers update is done after widget resets as modifiers
        // associated callbacks need to have all the widgets with the proper
        // state before evaluation
        defs.push(this._updateAllModifiers(record));

        return $.when.apply($, defs).then(function () {
            return resetWidgets;
        });
    },
    /**
     * Activates the widget and move the cursor to the given offset
     *
     * @param {string} id
     * @param {string} fieldName
     * @param {integer} offset
     */
    focusField: function (id, fieldName, offset) {
        this.editRecord(id);
        if (typeof offset === "number") {
            var field = _.findWhere(this.allFieldWidgets[id], {name: fieldName});
            dom.setSelectionRange(field.getFocusableElement().get(0), {start: offset, end: offset});
        }
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Add a tooltip on a $node, depending on a field description
     *
     * @param {FieldWidget} widget
     * @param {$node} $node
     */
    _addFieldTooltip: function (widget, $node) {
        // optional argument $node, the jQuery element on which the tooltip
        // should be attached if not given, the tooltip is attached on the
        // widget's $el
        $node = $node.length ? $node : widget.$el;
        $node.tooltip({
            delay: { show: 1000, hide: 0 },
            title: function () {
                return qweb.render('WidgetLabel.tooltip', {
                    debug: config.debug,
                    widget: widget,
                });
            }
        });
    },
    /**
     * Does the necessary DOM updates to match the given modifiers data. The
     * modifiers data is supposed to contain the properly evaluated modifiers
     * associated to the given records and elements.
     *
     * @param {Object} modifiersData
     * @param {Object} record
     * @param {Object} [element] - do the update only on this element if given
     */
    _applyModifiers: function (modifiersData, record, element) {
        var self = this;
        var modifiers = modifiersData.evaluatedModifiers[record.id] || {};

        if (element) {
            _apply(element);
        } else {
            // Clone is necessary as the list might change during _.each
            _.each(_.clone(modifiersData.elementsByRecord[record.id]), _apply);
        }

        function _apply(element) {
            // If the view is in edit mode and that a widget have to switch
            // its "readonly" state, we have to re-render it completely
            if ('readonly' in modifiers && element.widget) {
                var mode = modifiers.readonly ? 'readonly' : modifiersData.baseMode;
                if (mode !== element.widget.mode) {
                    self._rerenderFieldWidget(element.widget, record, mode);
                    return; // Rerendering already applied the modifiers, no need to go further
                }
            }

            // Toggle modifiers CSS classes if necessary
            element.$el.toggleClass("o_invisible_modifier", !!modifiers.invisible);
            element.$el.toggleClass("o_readonly_modifier", !!modifiers.readonly);
            element.$el.toggleClass("o_required_modifier", !!modifiers.required);

            // Call associated callback
            if (element.callback) {
                element.callback(element, modifiers, record);
            }
        }
    },
    /**
     * This is a wrapper of the {@see _activateWidget} function to select
     * the next possible widget instead of the given one.
     *
     * @private
     * @param {Object} record
     * @param {integer} currentIndex
     * @return {integer}
     */
    _activateNextWidget: function (record, currentIndex) {
        var tabindexWidgets = !_.isEmpty(this.tabindexWidgets) ? this.tabindexWidgets : this.allFieldWidgets;
        currentIndex = (currentIndex + 1) % (tabindexWidgets[record.id] || []).length;
        return this._activateWidget(record, currentIndex, {inc: 1});
    },
    /**
     * This is a wrapper of the {@see _activateWidget} function to select
     * the previous possible widget instead of the given one.
     *
     * @private
     * @param {Object} record
     * @param {integer} currentIndex
     * @return {integer}
     */
    _activatePreviousWidget: function (record, currentIndex) {
        var tabindexWidgets = !_.isEmpty(this.tabindexWidgets) ? this.tabindexWidgets : this.allFieldWidgets;
        currentIndex = currentIndex ? (currentIndex - 1) : ((tabindexWidgets[record.id] || []).length - 1);
        return this._activateWidget(record, currentIndex, {inc:-1});
    },
    /**
     * Activates the widget at the given index for the given record if possible
     * or the "next" possible one. Usually, a widget can be activated if it is
     * in edit mode(if it is field widget), and if it is visible.
     *
     * @private
     * @param {Object} record
     * @param {integer} currentIndex
     * @param {Object} [options]
     * @param {integer} [options.inc=1] - the increment to use when searching for the
     *   "next" possible one
     * @param {boolean} [options.wrap=true] if true, when we arrive at the end of the
     *   list of widget, we wrap around and try to activate widgets starting at
     *   the beginning. Otherwise, we just stop trying and return -1
     * @returns {integer} the index of the widget that was activated or -1 if
     *   none was possible to activate
     */
    _activateWidget: function (record, currentIndex, options) {
        var tabindexWidgets = !_.isEmpty(this.tabindexWidgets) ? this.tabindexWidgets : this.allFieldWidgets;
        options = options || {};
        _.defaults(options, {inc: 1, wrap: true});

        var recordWidgets = tabindexWidgets[record.id] || [];
        for (var i = 0 ; i < recordWidgets.length ; i++) {
            var activated = recordWidgets[currentIndex] && recordWidgets[currentIndex].activate({event: options.event});
            if (activated) {
                var reverse = true && options.inc < 0; // If options.inc is in negative it means reverse navigation
                if (recordWidgets[currentIndex]) {
                    this._scrollTo(recordWidgets[currentIndex], reverse);
                }
                return currentIndex;
            }

            currentIndex += options.inc;
            if (currentIndex >= recordWidgets.length) {
                if (options.wrap) {
                    currentIndex -= recordWidgets.length;
                } else {
                    return -1;
                }
            } else if (currentIndex < 0) {
                if (options.wrap) {
                    currentIndex += recordWidgets.length;
                } else {
                    return -1;
                }
            }
        }
        return -1;
    },
    /**
     * Determines if a given field widget value can be saved. For this to be
     * true, the widget must be valid (properly parsed value) and have a value
     * if the associated view field is required.
     *
     * @private
     * @param {AbstractField} widget
     * @returns {boolean|Deferred<boolean>} @see AbstractField.isValid
     */
    _canWidgetBeSaved: function (widget) {
        var modifiers = this._getEvaluatedModifiers(widget.__node, widget.record);
        return widget.isValid() && (widget.isSet() || !modifiers.required);
    },
    /**
     * Destroys a given widget associated to the given record and removes it
     * from internal referencing.
     *
     * @private
     * @param {string} recordID id of the local resource
     * @param {AbstractField} widget
     * @returns {integer} the index of the removed widget
     */
    _destroyFieldWidget: function (recordID, widget) {
        var recordWidgets = this.allFieldWidgets[recordID];
        var index = recordWidgets.indexOf(widget);
        if (index >= 0) {
            recordWidgets.splice(index, 1);
        }
        this._unregisterModifiersElement(widget.__node, recordID, widget);
        widget.destroy();
        return index;
    },
    /**
     * Searches for the last evaluation of the modifiers associated to the given
     * data (modifiers evaluation are supposed to always be up-to-date as soon
     * as possible).
     *
     * @private
     * @param {Object} node
     * @param {Object} record
     * @returns {Object} the evaluated modifiers associated to the given node
     *                   and record (not recomputed by the call)
     */
    _getEvaluatedModifiers: function (node, record) {
        var element = this._getModifiersData(node);
        if (!element) {
            return {};
        }
        return element.evaluatedModifiers[record.id] || {};
    },
    /**
     * Searches through the registered modifiers data for the one which is
     * related to the given node.
     *
     * @private
     * @param {Object} node
     * @returns {Object|undefined} related modifiers data if any
     *                             undefined otherwise
     */
    _getModifiersData: function (node) {
        return _.findWhere(this.allModifiersData, {node: node});
    },
    /**
     * @private
     * @param {jQueryElement} $el
     * @param {Object} node
     */
    _handleAttributes: function ($el, node) {
        if (node.attrs.class) {
            $el.addClass(node.attrs.class);
        }
        if (node.attrs.style) {
            $el.attr('style', node.attrs.style);
        }
    },
    /**
     * Used by list and kanban renderers to determine whether or not to display
     * the no content helper (if there is no data in the state to display)
     *
     * @private
     * @returns {boolean}
     */
    _hasContent: function () {
        return this.state.count !== 0;
    },
    /**
     * This function is called each time a field widget is created, when it is
     * ready (after its willStart and Start methods are complete).  This is the
     * place where work having to do with $el should be done.
     *
     * @private
     * @param {Widget} widget the field widget instance
     * @param {Object} node the attrs coming from the arch
     */
    _postProcessField: function (widget, node) {
    },
    /**
     * Registers or updates the modifiers data associated to the given node.
     * This method is quiet complex as it handles all the needs of the basic
     * renderers:
     *
     * - On first registration, the modifiers are evaluated thanks to the given
     *   record. This allows nodes that will produce an AbstractField instance
     *   to have their modifiers registered before this field creation as we
     *   need the readonly modifier to be able to instantiate the AbstractField.
     *
     * - On additional registrations, if the node was already registered but the
     *   record is different, we evaluate the modifiers for this record and
     *   saves them in the same object (without reparsing the modifiers).
     *
     * - On additional registrations, the modifiers are not reparsed (or
     *   reevaluated for an already seen record) but the given widget or DOM
     *   element is associated to the node modifiers.
     *
     * - The new elements are immediately adapted to match the modifiers and the
     *   given associated callback is called even if there is no modifiers on
     *   the node (@see _applyModifiers). This is indeed necessary as the
     *   callback is a description of what to do when a modifier changes. Even
     *   if there is no modifiers, this action must be performed on first
     *   rendering to avoid code duplication. If there is no modifiers, they
     *   will however not be registered for modifiers updates.
     *
     * - When a new element is given, it does not replace the old one, it is
     *   added as an additional element. This is indeed useful for nodes that
     *   will produce multiple DOM (as a list cell and its internal widget or
     *   a form field and its associated label).
     *   (@see _unregisterModifiersElement for removing an associated element.)
     *
     * Note: also on view rerendering, all the modifiers are forgotten so that
     * the renderer only keeps the ones associated to the current DOM state.
     *
     * @private
     * @param {Object} node
     * @param {Object} record
     * @param {jQuery|AbstractField} [element]
     * @param {Object} [options]
     * @param {Object} [options.callback] - the callback to call on registration
     *                                    and on modifiers updates
     * @returns {Object} for code efficiency, returns the last evaluated
     *                   modifiers for the given node and record.
     */
    _registerModifiers: function (node, record, element, options) {
        // Check if we already registered the modifiers for the given node
        // If yes, this is simply an update of the related element
        // If not, check the modifiers to see if it needs registration
        var modifiersData = this._getModifiersData(node);
        if (!modifiersData) {
            var modifiers = node.attrs.modifiers || {};
            modifiersData = {
                node: node,
                modifiers: modifiers,
                evaluatedModifiers: {},
                elementsByRecord: {},
            };
            if (!_.isEmpty(modifiers)) { // Register only if modifiers might change (TODO condition might be improved here)
                this.allModifiersData.push(modifiersData);
            }
        }
        // we register here the base mode of the node.  This is a field widget
        // specific settings which represents the generic mode for the widget,
        // regardless of its modifiers.  The interesting case is the list view:
        // all widgets are supposed to be in the baseMode 'readonly', except the
        // ones that are in the line that is currently being edited.
        modifiersData.baseMode = (options && options.mode) || this.mode;

        // Evaluate if necessary
        if (!modifiersData.evaluatedModifiers[record.id]) {
            modifiersData.evaluatedModifiers[record.id] = record.evalModifiers(modifiersData.modifiers);
        }

        // Element might not be given yet (a second call to the function can
        // update the registration with the element)
        if (element) {
            var newElement = {};
            if (element instanceof jQuery) {
                newElement.$el = element;
            } else {
                newElement.widget = element;
                newElement.$el = element.$el;
            }
            if (options && options.callback) {
                newElement.callback = options.callback;
            }

            if (!modifiersData.elementsByRecord[record.id]) {
                modifiersData.elementsByRecord[record.id] = [];
            }
            modifiersData.elementsByRecord[record.id].push(newElement);

            this._applyModifiers(modifiersData, record, newElement, options);
        }

        return modifiersData.evaluatedModifiers[record.id];
    },
    /**
     * Render the view
     *
     * @override
     * @returns {Deferred}
     */
    _render: function () {
        var oldAllFieldWidgets = this.allFieldWidgets;
        this.allFieldWidgets = {}; // TODO maybe merging allFieldWidgets and allModifiersData into "nodesData" in some way could be great
        this.allModifiersData = [];
        this.tabindexWidgets = {};
        this.tabindexFieldWidgets = {};
        return this._renderView().then(function () {
            _.each(oldAllFieldWidgets, function (recordWidgets) {
                _.each(recordWidgets, function (widget) {
                    widget.destroy();
                });
            });
        });
    },
    /**
     * Instantiates the appropriate AbstractField specialization for the given
     * node and prepares its rendering and addition to the DOM. Indeed, the
     * rendering of the widget will be started and the associated deferred will
     * be added to the 'defs' attribute. This is supposed to be created and
     * deleted by the calling code if necessary.
     *
     * Note: we always return a $el.  If the field widget is asynchronous, this
     * $el will be replaced by the real $el, whenever the widget is ready (start
     * method is done).  This means that this is not the correct place to make
     * changes on the widget $el.  For this, @see _postProcessField method
     *
     * @private
     * @param {Object} node
     * @param {Object} record
     * @param {Object} [options]
     * @returns {jQueryElement}
     */
    _renderFieldWidget: function (node, record, options) {
        var fieldName = node.attrs.name;
        // Register the node-associated modifiers
        var mode = options && options.mode || this.mode;
        var modifiers = this._registerModifiers(node, record, null, options);
        // Initialize and register the widget
        // Readonly status is known as the modifiers have just been registered
        var Widget = record.fieldsInfo[this.viewType][fieldName].Widget;
        var widget = new Widget(this, fieldName, record, {
            mode: modifiers.readonly ? 'readonly' : mode,
            viewType: this.viewType,
        });

        // Register the widget so that it can easily be found again
        if (this.allFieldWidgets[record.id] === undefined) {
            this.allFieldWidgets[record.id] = [];
        }
        if (this.tabindexFieldWidgets[record.id] === undefined) {
            this.tabindexFieldWidgets[record.id] = [];
        }
        this.allFieldWidgets[record.id].push(widget);

        // Note: Can be moved to _render method in then callback to find tabindex widgets from allFieldWidgets
        if (node.attrs.tabindex !== '-1' && !widget.noTabindex) {
            this.tabindexFieldWidgets[record.id].push(widget);
        }

        widget.__node = node; // TODO get rid of this if possible one day

        // Prepare widget rendering and save the related deferred
        var def = widget._widgetRenderAndInsert(function () {});
        var async = def.state() === 'pending';
        var $el = async ? $('<div>') : widget.$el;
        if (async) {
            this.defs.push(def);
        }

        // Update the modifiers registration by associating the widget and by
        // giving the modifiers options now (as the potential callback is
        // associated to new widget)
        var self = this;
        def.then(function () {
            if (async) {
                $el.replaceWith(widget.$el);
            }
            self._registerModifiers(node, record, widget, {
                callback: function (element, modifiers, record) {
                    element.$el.toggleClass('o_field_empty', !!(
                        record.data.id
                        && (modifiers.readonly || mode === 'readonly')
                        && !element.widget.isSet()
                    ));
                },
                mode: mode
            });
            self._postProcessField(widget, node);
        });

        return $el;
    },
    /**
     * Renders the nocontent helper.
     *
     * This method is a helper for renderers that want to display a help
     * message when no content is available.
     *
     * @private
     */
    _renderNoContentHelper: function () {
        var $msg = $('<div>')
            .addClass('o_view_nocontent')
            .html(this.noContentHelp);
        this.$el.html($msg);
    },
    /**
     * Actual rendering. Supposed to be overridden by concrete renderers.
     * The basic responsabilities of _renderView are:
     * - use the xml arch of the view to render a jQuery representation
     * - instantiate a widget from the registry for each field in the arch
     *
     * Note that the 'state' field should contains all necessary information
     * for the rendering. The field widgets should be as synchronous as
     * possible.
     *
     * @abstract
     * @returns {Deferred}
     */
    _renderView: function () {
        return $.when();
    },
    /**
     * Instantiate custom widgets
     *
     * @private
     * @param {Object} record
     * @param {Object} node
     * @returns {jQueryElement}
     */
    _renderWidget: function (record, node) {
        var Widget = widgetRegistry.get(node.attrs.name);
        var widget = new Widget(this, record);

        // Prepare widget rendering and save the related deferred
        var def = widget._widgetRenderAndInsert(function () {});
        if (def.state() === 'pending') {
            this.defs.push(def);
        }

        // handle other attributes/modifiers
        this._handleAttributes(widget.$el, node);
        this._registerModifiers(node, record, widget);
        widget.$el.addClass('o_widget');
        return widget.$el;
    },

    /**
     * Rerenders a given widget and make sure the associated data which
     * referenced the old one is updated.
     *
     * @private
     * @param {Widget} widget
     * @param {Object} record
     * @param {string} mode either 'readonly' or 'edit'
     */
    _rerenderFieldWidget: function (widget, record, mode) {
        // Render the new field widget
        var $el = this._renderFieldWidget(widget.__node, record, {mode: mode});
        widget.$el.replaceWith($el);

        // Destroy the old widget and position the new one at the old one's
        var oldIndex = this._destroyFieldWidget(record.id, widget);
        var recordWidgets = this.allFieldWidgets[record.id];
        var newWidget = recordWidgets.pop();
        recordWidgets.splice(oldIndex, 0, newWidget);
    },
    /**
     * This will scroll view automatically when widget is at bottom of the screen
     * Will be called from _activateWidget method so when user using keyboard to navigate
     * and widget is at bottom of the screen then this method will automatically scroll upto widget position
     *
     * @private
     * @param {Object} widget
     * @param {boolean} reverse
     */
    _scrollTo: function (widget, reverse) {
        var $scrollableElement = this.$el.scrollParent();
        var offsetTop = widget.$el.offset().top;
        if ($scrollableElement.offset()) {
            offsetTop = offsetTop - $scrollableElement.offset().top;
            if (reverse && offsetTop < 0) {
                $scrollableElement.animate({scrollTop: offsetTop - ($scrollableElement.height() * 0.05)}, 1000);
            } else if (offsetTop > $scrollableElement.height() - ($scrollableElement.height() * 0.10)) {
                $scrollableElement.animate({scrollTop: offsetTop - ($scrollableElement.height() * 0.05)}, 1000);
            }
        }
    },
    /**
     * Unregisters an element of the modifiers data associated to the given
     * node and record.
     *
     * @param {Object} node
     * @param {string} recordID id of the local resource
     * @param {jQuery|AbstractField} element
     */
    _unregisterModifiersElement: function (node, recordID, element) {
        var modifiersData = this._getModifiersData(node);
        if (modifiersData) {
            var elements = modifiersData.elementsByRecord[recordID];
            var index = _.findIndex(elements, function (oldElement) {
                return oldElement.widget === element
                    || oldElement.$el[0] === element[0];
            });
            if (index >= 0) {
                elements.splice(index, 1);
            }
        }
    },
    /**
     * Does two actions, for each registered modifiers:
     * 1) Recomputes the modifiers associated to the given record and saves them
     *    (as boolean values) in the appropriate modifiers data.
     * 2) Updates the rendering of the view elements associated to the given
     *    record to match the new modifiers.
     *
     * @see _applyModifiers
     *
     * @private
     * @param {Object} record
     * @returns {Deferred} resolved once finished
     */
    _updateAllModifiers: function (record) {
        var self = this;

        var defs = [];
        this.defs = defs; // Potentially filled by widget rerendering
        _.each(this.allModifiersData, function (modifiersData) {
            modifiersData.evaluatedModifiers[record.id] = record.evalModifiers(modifiersData.modifiers);
            self._applyModifiers(modifiersData, record);
        });
        delete this.defs;

        return $.when.apply($, defs);
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * When someone presses the TAB/UP/DOWN/... key in a widget, it is nice to
     * be able to navigate in the view (default browser behaviors are disabled
     * by Odoo).
     *
     * @abstract
     * @private
     * @param {OdooEvent} ev
     */
    _onNavigationMove: function (ev) {},
    /**
     * Set lastTabindex property
     * When user presses any button then view will be re-rendered
     * and we will not have reference of last tabindex element, where to set focus next,
     * so to have next focus after button pressed we will preserve lastTabindex property
     *
     * @private
     * @param {OdooEvent} ev
     */
    _onSetLastTabindex: function (ev) {
        this.lastTabindex = this.tabindexWidgets[this.state.id].indexOf(ev.data.target);
    }
});

return BasicRenderer;
});
