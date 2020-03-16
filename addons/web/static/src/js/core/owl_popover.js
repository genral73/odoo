odoo.define('web.OwlPopover', function() {
    'use strict';

    const { Component, hooks, misc } = owl;
    const { Portal } = misc;
    const { useExternalListener, useRef } = hooks;

    /**
     * Popover (owl version)
     *
     * Represents a bootstrap-styled popover handled with pure JS. The popover
     * will be visually bound to its `target`.
     * @extends Component
     **/
    class Popover extends Component {
        /**
         * @param {Object} [props]
         * @param {string} [props.position='bottom'] 'top', 'bottom', 'left' or 'right'
         * @param {HTMLElement} [props.target='body'] the target element (the popover's
         *                      arrow decoration will point to it)
         * @param {string} [props.title]
         */
        constructor() {
            super(...arguments);
            this.popoverRef = useRef('popover');
            this.orderedPositions = ['top', 'right', 'bottom', 'left'];
            useExternalListener(window, 'click', this._onDocumentClick);
            useExternalListener(window, 'scroll', this._onWindowChange);
            useExternalListener(window, 'resize', this._onWindowChange);
        }

        /**
         * @override
         */
        mounted() {
            super.mounted(...arguments);
            this.display(this);
        }

        /**
         * Display the popover according to its props. This method will try to position the
         * popover as request (according to the `position` props) but will fallback
         * on 'bottom' positioning if the requested position would put it outside of the
         * viewport.
         */
        display() {
            const {
                top: targetTop,
                left: targetLeft,
            } = this.props.target.getBoundingClientRect();
            const {
                offsetHeight: targetHeight,
                offsetWidth: targetWidth,
            } = this.props.target;
            const {
                offsetHeight: popoverHeight,
                offsetWidth: popoverWidth,
            } = this.popoverRef.el;

            const positionIndex = this.orderedPositions.indexOf(
                this.props.position
            );

            // computation of the absolute positioning; depends on the target & on the
            // positioning of the popover.
            const positions = {
                top: {
                    name: 'top',
                    top: targetTop - popoverHeight,
                    left: targetLeft - (popoverWidth - targetWidth) / 2,
                },
                right: {
                    name: 'right',
                    top: targetTop - (popoverHeight - targetHeight) / 2,
                    left: targetLeft + targetWidth,
                },
                bottom: {
                    name: 'bottom',
                    top: targetTop + targetHeight,
                    left: targetLeft - (popoverWidth - targetWidth) / 2,
                },
                left: {
                    name: 'left',
                    top: targetTop - (popoverHeight - targetHeight) / 2,
                    left: targetLeft - popoverWidth,
                },
            };

            // find the requested position and check if it fits the viewport
            const position = this.orderedPositions
                .slice(positionIndex)
                .concat(this.orderedPositions.slice(0, positionIndex))
                .map((pos) => positions[pos])
                .find((pos) => {
                    this.popoverRef.el.style.top = `${pos.top}px`;
                    this.popoverRef.el.style.left = `${pos.left}px`;
                    return this._isInViewport();
                });

            // remove all positioning classes
            this.orderedPositions.forEach((pos) => {
                this.popoverRef.el.classList.remove(`o_popover--${pos}`);
            });

            // apply the request position if it fits the viewport, otherwise
            // fallback to 'bottom'
            if (position) {
                this.popoverRef.el.classList.add(`o_popover--${position.name}`);
            } else {
                this.popoverRef.el.style.top = positions.bottom.top;
                this.popoverRef.el.style.left = positions.bottom.left;
                this.popoverRef.el.classList.add(`o_popover--bottom`);
            }
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * Send an event signaling that the popover must be closed.
         * @private
         */
        _close() {
            this.trigger('close-popover');
        }

        /**
         * Check if the popover fits the viewport.
         * @returns {Boolean} True if the popover fits in the viewport, false otherwise.
         */
        _isInViewport() {
            const element = this.popoverRef.el;
            const rect = element.getBoundingClientRect();
            const html = document.documentElement;
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || html.clientHeight) &&
                rect.right <= (window.innerWidth || html.clientWidth)
            );
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------
        /**
         * Handle clicks outside of the popover to trigger its closing.
         * Note: if the click event is stopped before bubbling up to the document,
         * this handler will *not* be fired. Make sure to add custom click handlers
         * if necessary.
         * @private
         * @param {DOMEvent} e
         */
        _onDocumentClick(e) {
            if (!this.popoverRef.el.contains(e.target)) {
                this._close();
            }
        }

        /**
         * Handle changes in the window size to reposition the popover next to
         * its target.
         * @private
         * @param {DOMEvent} e
         */
        _onWindowChange(e) {
            this.display();
        }
    }

    Popover.components = { Portal };
    Popover.defaultProps = {
        position: 'bottom',
    };
    Popover.props = {
        position: {
            validate: (p) => ['top', 'bottom', 'left', 'right'].includes(p),
            optional: 1,
        },
        target: {
            type: HTMLElement,
        },
        title: { type: String, optional: 1 },
    };
    Popover.template = 'OwlPopover';

    return Popover;
});
