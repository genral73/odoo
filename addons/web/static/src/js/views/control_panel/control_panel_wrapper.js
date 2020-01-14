odoo.define('web.ControlPanelWrapper', function (require) {
"use strict";

    const { ComponentWrapper } = require('web.OwlCompatibility');
    const { useRef } = owl.hooks;

    /**
     * Extract the 'cp_content' key of the given props and return them as well as
     * the extracted content.
     * @param {Object} props
     * @returns {Object{Object,Object}}
     */
    function extractAdditionalContent(props) {
        const cleanProps = Object.assign({}, props);
        const additionalContent = {};
        if ('cp_content' in cleanProps) {
            const content = cleanProps.cp_content || {};
            if ('$buttons' in content) {
                additionalContent.buttons = content.$buttons;
            }
            if ('$searchview' in content) {
                additionalContent.searchView = content.$searchview;
            }
            if ('$pager' in content) {
                additionalContent.pager = content.$pager;
            }
            if ('$searchview_buttons' in content) {
                additionalContent.searchViewButtons = content.$searchview_buttons;
            }
            delete cleanProps.cp_content;
        }
        return { additionalContent, cleanProps };
    }

    class ControlPanelWrapper extends ComponentWrapper {

        constructor(parent, Component, props) {
            const { additionalContent, cleanProps } = extractAdditionalContent(props);

            super(parent, Component, cleanProps);

            this.additionalContent = additionalContent;

            this.controlPanel = useRef("component");
        }

        mounted() {
            this._attachAdditionalContent();
        }

        patched() {
            this._attachAdditionalContent();
        }

        //--------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------

        /**
         * @override
         */
        async update(newProps) {
            const { additionalContent, cleanProps } = extractAdditionalContent(newProps);
            Object.assign(this.additionalContent, additionalContent);
            return super.update(cleanProps);
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * Attach additional content extracted from the props 'cp_content' key, if any.
         * @private
         */
        _attachAdditionalContent() {
            const controlPanel = this.controlPanel.comp;
            for (const key in this.additionalContent) {
                if (this.additionalContent[key] && this.additionalContent[key].length) {
                    const target = controlPanel.contentRefs[key].el;
                    target.innerHTML = "";
                    target.append(...this.additionalContent[key]);
                }
                delete this.additionalContent[key];
            }
        }
    }

    return ControlPanelWrapper;
});