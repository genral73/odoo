odoo.define('web.SearchBar', function (require) {
    "use strict";

    const Domain = require('web.Domain');
    const field_utils = require('web.field_utils');
    const SearchFacet = require('web.SearchFacet');
    const { useFocusOnUpdate } = require('web.custom_hooks');

    const CHAR_FIELDS = ['char', 'html', 'many2many', 'many2one', 'one2many', 'text'];
    const { Component, hooks } = owl;
    const { useExternalListener, useGetters, useRef, useState, useDispatch } = hooks;

    let sourceId = 0;

    /**
     * Search bar
     *
     * @extends Component
     */
    class SearchBar extends Component {
        /**
         * @override
         * @param {Object} [props]
         * @param {Object} [props.fields]
         */
        constructor() {
            super(...arguments);

            this.dispatch = useDispatch(this.env.controlPanelModel);
            this.getters = useGetters(this.env.controlPanelModel);
            this.searchInputRef = useRef('search-input');
            this.state = useState({
                sources: [],
                focusedItem: 0,
                inputValue: "",
            });
            this.focusOnUpdate = useFocusOnUpdate();
            this.focusOnUpdate();
            useExternalListener(window, 'keydown', this._onWindowKeydown);

            this.allowMouseenter = false;
            this.autoCompleteSources = this.getters.getFiltersOfType('field').map(
                filter => this._createSource(filter)
            );
            this.noResultItem = [null, this.env._t("(no result)")];
        }

        mounted() {
            this.env.bus.on('focus-control-panel', this, () => this.searchInputRef.el.focus());
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * @private
         */
        _closeAutoComplete() {
            this.allowMouseenter = false;
            this.state.sources = [];
            this.state.focusedItem = 0;
            this.focusOnUpdate();
        }

        /**
         * @private
         * @param {Object} filter
         * @returns {Object}
         */
        _createSource(filter) {
            const source = {
                active: true,
                description: filter.description,
                fieldName: filter.fieldName,
                filterId: filter.id,
                filterOperator: filter.operator,
                id: sourceId ++,
                operator: CHAR_FIELDS.includes(filter.fieldType) ? 'ilike' : '=',
                parent: false,
            };
            switch (filter.fieldType) {
                case 'selection':
                    source.active = false;
                    source.selection = this.props.fields[filter.fieldName].selection;
                    break;
                case 'boolean':
                    source.active = false;
                    source.selection = [
                        [true, this.env._t("Yes")],
                        [false, this.env._t("No")],
                    ];
                    break;
                case 'many2one':
                    source.expand = true;
                    source.expanded = false;
                    if (filter.domain) {
                        source.domain = filter.domain;
                    }
            }
            return source;
        }

        /**
         * @private
         * @param {Object} source
         * @param {[any, string]} values
         * @param {boolean} [active=true]
         */
        _createSubSource(source, [value, label], active = true) {
            const subSource = {
                active,
                fieldName: source.fieldName,
                filterId: source.filterId,
                filterOperator: source.filterOperator,
                id: sourceId ++,
                label,
                operator: '=',
                parent: source,
                value,
            };
            return subSource;
        }

        /**
         * @private
         * @param {Object} source
         * @param {boolean} shouldExpand
         */
        async _expandSource(source, shouldExpand) {
            source.expanded = shouldExpand;
            if (shouldExpand) {
                let args = source.domain;
                if (typeof args === 'string') {
                    try {
                        args = Domain.prototype.stringToArray(args);
                    } catch (err) {
                        args = [];
                    }
                }
                const { context, relation } = this.props.fields[source.fieldName];
                const results = await this.rpc({
                    kwargs: {
                        args,
                        context,
                        limit: 8,
                        name: this.state.inputValue.trim(),
                    },
                    method: 'name_search',
                    model: relation,
                });
                const options = results.map(result => this._createSubSource(source, result));
                const parentIndex = this.state.sources.indexOf(source);
                if (!options.length) {
                    options.push(this._createSubSource(source, this.noResultItem, false));
                }
                this.state.sources.splice(parentIndex + 1, 0, ...options);
            } else {
                this.state.sources = this.state.sources.filter(src => src.parent !== source);
            }
            this.focusOnUpdate();
        }

        /**
         * @private
         * @param {string} query
         */
        _filterSources(query) {
            return this.autoCompleteSources.reduce(
                (sources, source) => {
                    // Field selection or boolean.
                    if (source.selection) {
                        const options = source.selection.reduce(
                            (acc, result) => {
                                if (fuzzy.test(query, result[1].toLowerCase())) {
                                    acc.push(this._createSubSource(source, result));
                                }
                                return acc;
                            },
                            []
                        );
                        if (options.length) {
                            sources.push(source, ...options);
                        }
                    // Any other type.
                    } else if (this._validateSource(query, source)) {
                        sources.push(source);
                    }
                    // Fold any expanded item.
                    if (source.expanded) {
                        source.expanded = false;
                    }
                    return sources;
                },
                []
            );
        }

        /**
         * Focus the search facet at the designated index if any.
         * @private
         */
        _focusFacet(index) {
            const facets = this.el.getElementsByClassName('o_searchview_facet');
            if (facets.length) {
                facets[index].focus();
            }
        }

        /**
         * Try to parse the given rawValue according to the type of the given
         * source field type. The returned formatted value is the one that will
         * supposedly be sent to the server.
         * @private
         * @param {string} rawValue
         * @param {Object} source
         * @returns {string}
         */
        _parseWithSource(rawValue, source) {
            const { type } = this.props.fields[source.fieldName];
            const parser = field_utils.parse[type];
            let parsedValue;
            if (['date', 'datetime'].includes(type)) {
                const parsedDate = parser(rawValue, { type }, { timezone: true });
                const dateFormat = type === 'datetime' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD';
                const momentValue = moment(parsedDate, dateFormat);
                if (!momentValue.isValid()) {
                    throw new Error('Invalid date');
                }
                parsedValue = parsedDate.toJSON();
            } else {
                parsedValue = parser(rawValue);
            }
            return parsedValue;
        }

        /**
         * @private
         * @param {Object} source
         */
        _selectSource(source) {
            // Inactive sources are:
            // - Selection sources
            // - "no result" items
            if (source.active) {
                const labelValue = source.label || this.state.inputValue;
                this.dispatch('addAutoCompletionValues', {
                    filterId: source.filterId,
                    value: source.value || this._parseWithSource(labelValue, source),
                    label: labelValue,
                    operator: source.filterOperator || source.operator,
                });
            }
            this.state.inputValue = "";
            this.searchInputRef.el.value = "";
            this._closeAutoComplete();
        }

        /**
         * Bind a global event to allow mouseenter events on the next mouse move.
         * This is to prevent selecting a result simply by having the cursor hovering
         * on it when the results are first displayed.
         * @private
         */
        _unlockMouseEnterOnMove() {
            window.addEventListener('mousemove', () => {
                this.allowMouseenter = true;
            }, { once: true });
        }

        /**
         * @private
         * @param {string} query
         * @param {Object} source
         * @returns {boolean}
         */
        _validateSource(query, source) {
            try {
                this._parseWithSource(query, source);
            } catch (err) {
                return false;
            }
            return true;
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * @private
         * @param {number} facetIndex
         * @param {OwlEvent} ev
         */
        _onFacetNavigation(facetIndex, ev) {
            switch (ev.detail.direction) {
                case 'left':
                    if (facetIndex === 0) {
                        this.searchInputRef.el.focus();
                    } else {
                        this._focusFacet(facetIndex - 1);
                    }
                    break;
                case 'right':
                    const facets = this.el.getElementsByClassName('o_searchview_facet');
                    if (facetIndex === facets.length - 1) {
                        this.searchInputRef.el.focus();
                    } else {
                        this._focusFacet(facetIndex + 1);
                    }
                    break;
            }
        }

        /**
         * @private
         * @param {OwlEvent} ev
         */
        _onFacetRemoved(ev) {
            const facet = ev.detail;
            this.dispatch('deactivateGroup', facet.group.id);
        }

        /**
         * @private
         * @param {KeyboardEvent} ev
         */
        _onSearchKeydown(ev) {
            if (ev.isComposing) {
                // This case happens with an IME for example: we let it handle all key events.
                return;
            }
            const currentItem = this.state.sources[this.state.focusedItem] || {};
            switch (ev.key) {
                case 'ArrowDown':
                    ev.preventDefault();
                    if (Object.keys(this.state.sources).length) {
                        let nextIndex = this.state.focusedItem + 1;
                        if (nextIndex >= this.state.sources.length) {
                            nextIndex = 0;
                        }
                        this.state.focusedItem = nextIndex;
                    } else {
                        this.env.bus.trigger('focus-view');
                    }
                    break;
                case 'ArrowLeft':
                    if (currentItem.expanded) {
                        // Priority 1: fold expanded item.
                        ev.preventDefault();
                        this._expandSource(currentItem, false);
                    } else if (currentItem.parent) {
                        // Priority 2: focus parent item.
                        ev.preventDefault();
                        this.state.focusedItem = this.state.sources.indexOf(currentItem.parent);
                        // Priority 3: Do nothing (navigation inside text).
                    } else if (ev.target.selectionStart === 0) {
                        const facets = this.getters.getFacets();
                        // Priority 4: navigate to rightmost facet.
                        this._focusFacet(facets.length - 1);
                    }
                    break;
                case 'ArrowRight':
                    if (ev.target.selectionStart === this.state.inputValue.length) {
                        // Priority 1: Do nothing (navigation inside text).
                        if (currentItem.expand) {
                            // Priority 2: go to first child or expand item.
                            ev.preventDefault();
                            if (currentItem.expanded) {
                                this.state.focusedItem ++;
                            } else {
                                this._expandSource(currentItem, true);
                            }
                        } else if (ev.target.selectionStart === this.state.inputValue.length) {
                            // Priority 3: navigate to leftmost facet.
                            this._focusFacet(0);
                        }
                    }
                    break;
                case 'ArrowUp':
                    ev.preventDefault();
                    let previousIndex = this.state.focusedItem - 1;
                    if (previousIndex < 0) {
                        previousIndex = this.state.sources.length - 1;
                    }
                    this.state.focusedItem = previousIndex;
                    break;
                case 'Backspace':
                    if (!this.state.inputValue.length) {
                        const facets = this.getters.getFacets();
                        if (facets.length) {
                            const lastFacetGroupId = facets[facets.length - 1].group.id;
                            this.dispatch('deactivateGroup', lastFacetGroupId);
                        }
                    }
                    break;
                case 'Enter':
                    if (!this.state.inputValue.length) {
                        this.dispatch('search');
                        break;
                    } // No break here: select current result if there is a value.
                case 'Tab':
                    if (this.state.inputValue.length) {
                        this._selectSource(currentItem);
                    }
                    break;
                case 'Escape':
                    if (this.state.sources.length) {
                        this._closeAutoComplete();
                    }
                    break;
            }
        }

        /**
         * @private
         * @param {InputEvent} ev
         */
        _onSearchInput(ev) {
            this.state.inputValue = ev.target.value;
            const wasVisible = this.state.sources.length;
            const query = this.state.inputValue.trim().toLowerCase();
            if (query.length) {
                if (!wasVisible) {
                    this._unlockMouseEnterOnMove();
                }
                this.state.sources = this._filterSources(query);
            } else if (wasVisible) {
                this._closeAutoComplete();
            }
        }

        /**
         * Only handled if the user has moved its cursor at least once after the
         * results are loaded and displayed.
         * @private
         * @param {number} resultIndex
         */
        _onSourceMouseenter(resultIndex) {
            if (this.allowMouseenter) {
                this.state.focusedItem = resultIndex;
            }
        }

        /**
         * @private
         * @param {KeyboardEvent} ev
         */
        _onWindowKeydown(ev) {
            if (ev.key === 'Escape' && this.state.sources.length) {
                ev.preventDefault();
                ev.stopPropagation();
                this._closeAutoComplete();
            }
        }
    }

    SearchBar.components = { SearchFacet };
    SearchBar.defaultProps = {
        fields: {},
    };
    SearchBar.props = {
        fields: Object,
    };
    SearchBar.template = 'SearchBar';

    return SearchBar;
});
