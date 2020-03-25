odoo.define('mail.component.ComposerTextInput', function (require) {
'use strict';

const useStore = require('mail.hooks.useStore');

const { Component } = owl;
const { useDispatch, useGetters, useState, useRef } = owl.hooks;

/**
 * ComposerInput relies on a minimal HTML editor in order to support mentions.
 */
class ComposerTextInput extends Component {

    /**
     * @override
     * @param {...any} args
     */
    constructor(...args) {
        super(...args);
        this.storeDispatch = useDispatch();
        this.storeGetters = useGetters();
        this.storeProps = useStore((state, props) => {
            return {
                isMobile: state.isMobile,
                composer: state.composers[props.composerLocalId],
                thread: state.threads[state.composers[props.composerLocalId].threadLocalId],
            };
        });
        /**
         * Reference of the textarea. Useful to set height, selection and content.
         */
        this._textareaRef = useRef('textarea');

        this._mentions = this.storeProps.composer.mentionedPartners;

        /**
         * active_id refers to the current selected partner when mentions dropdown is visible
         * isMentionsOpen value triggers mentions dropdown visibility
         * mentionSuggestions is an array containing partners based on current typed search
         */
        this.state = useState({
            active_id: 0,
            isMentionsOpen: false,
            mentionSuggestions: [],
        });
    }

    /**
     * Updates the composer text input content when composer is mounted
     * as textarea content can't be changed from the DOM.
     */
    mounted() {
        this._update();
    }

    /**
     * Updates the composer text input content when composer has changed
     * as textarea content can't be changed from the DOM.
     */
    patched() {
        this._update();
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    focus() {
        this._textareaRef.el.focus();
    }

    focusout() {
        this.saveStateInStore();
        this._textareaRef.el.blur();
    }

    /**
     * Returns textarea current content.
     *
     * @returns {string}
     */
    getContent() {
        return this._textareaRef.el.value;
    }

    /**
     * Saves the composer text input state in store
     */
    saveStateInStore() {
        const data = {
            textInputContent: this.getContent(),
            textInputCursorStart: this._getSelectionStart(),
            textInputCursorEnd: this._getSelectionEnd(),
            mentionedPartners: this._getMentions(),
        };
        this.storeDispatch(
            'saveComposerTextInput',
            this.props.composerLocalId,
            data,
        );
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Detects if mentions suggestions should be displayed when user is typing
     * and searches partners based on user's research
     *
     * @private
     */
    async _detectDelimiter() {
        this._mentionWord = this._validateKeyword('@', false);
        if (this._mentionWord !== false) {
            await this._mentionFetchThrottled(
                'res.partner',
                'get_mention_suggestions',
                {
                    limit: 3,
                    search: this._mentionWord,
                }
            );

            if (this.state.mentionSuggestions[0].length === 0) {
                this.state.isMentionsOpen = false;
                this.state.active_id = 0;
            } else {
                this.state.isMentionsOpen = true;
                this.state.active_id = this.state.mentionSuggestions[0][0].id;
            }
        }
        else  {
            this.state.isMentionsOpen = false;
            this.saveStateInStore();
        }
    }

    /**
     * Returns mentioned partners after they've been validated.
     *
     * @private
     * @return {Array}
     */
    _getMentions() {
        this._validatePartnerIds();
        return this._mentions;
    }

    /**
     * Returns selection end position.
     *
     * @private
     * @returns {number}
     */
    _getSelectionEnd() {
        return this._textareaRef.el.selectionEnd;
    }

    /**
     * Returns selection start position.
     *
     * @private
     * @returns {number}
     *
     */
    _getSelectionStart() {
        return this._textareaRef.el.selectionStart;
    }

    /**
     * @private
     * @param selection
     */
    _insertMentionSuggestion(selection) {
        const cursorPosition = this._getSelectionStart();
        const textLeft = this.getContent().substring(0, cursorPosition - (this._mentionWord.length));
        const textRight = this.getContent().substring(cursorPosition, this.getContent().length);
        const insert = selection.name.replace(/ /g, '\u00a0');
        this._textareaRef.el.value = textLeft + insert + ' ' + textRight;
        this._textareaRef.el.setSelectionRange(
            textLeft.length + selection.name.length + 2,
            textLeft.length + selection.name.length + 2
        );

        const mention = this._mentions.find(function(item) {
            return item.id === selection.id;
        });

        if (!mention) {
            this._mentions.push(selection);
        }
        this.saveStateInStore();
        this.state.isMentionsOpen = false;
    }

    /**
     * Determines whether the textarea is empty or not.
     *
     * @private
     * @return {boolean}
     */
    _isEmpty() {
        return this.getContent() === "";
    }

    /**
     * Triggers RPC to search mentioned partners based on user's research
     * and add im_status to resulted partners.
     *
     * @private
     * @param model
     * @param method
     * @param kwargs
     */
    async _mentionFetchThrottled(model, method, kwargs) {
        const suggestions = this.storeGetters.mentionSuggestions(this._mentionWord);
        const prefetchedPartners = await this.env.rpc({
            model: 'mail.channel',
            method: 'channel_fetch_listeners',
            args: [this.storeProps.thread.uuid],
            }, {
                shadow: true
        });

        this.state.mentionSuggestions = await this.env.rpc({
            model: model,
            method: method,
            kwargs: kwargs,
        });

        for (const mentionSuggestion of this.state.mentionSuggestions[0]) {
            mentionSuggestion.im_status = this.env.call('mail_service', 'getImStatus', { partnerID: mentionSuggestion.id });
        }
    }

    /**
     * Updates the content and height of a textarea
     *
     * @private
     */
    _update() {
        this._textareaRef.el.value = this.storeProps.composer.textInputContent;
        if (!this.state.isMentionsOpen) {
            this._textareaRef.el.setSelectionRange(
                this.storeProps.composer.textInputCursorStart,
                this.storeProps.composer.textInputCursorEnd);
        }
        this._mentions = this.storeProps.composer.mentionedPartners;
        this._updateHeight();
    }

    /**
     * Updates the textarea height.
     *
     * @private
     */
    _updateHeight() {
        this._textareaRef.el.style.height = "0px";
        this._textareaRef.el.style.height = (this._textareaRef.el.scrollHeight) + "px";
    }

    /**
     * Validates a keyword in order to trigger mentions search.
     *
     * @private
     * @param delimiter
     * @param beginningOnly
     * @return {*}
     */
    _validateKeyword(delimiter, beginningOnly) {
        const leftString = this.getContent().substring(0, this._getSelectionStart());

        // use position before delimiter because there should be whitespaces
        // or line feed/carriage return before the delimiter
        const beforeDelimiterPosition = leftString.lastIndexOf(delimiter) - 1;
        if (beginningOnly && beforeDelimiterPosition > 0) {
            return false;
        }
        let searchStr = this.getContent().substring(beforeDelimiterPosition, this._getSelectionStart());
        // regex string start with delimiter or whitespace then delimiter
        const pattern = "^"+delimiter+"|^\\s"+delimiter;
        const regexStart = new RegExp(pattern, 'g');
        // trim any left whitespaces or the left line feed/ carriage return
        // at the beginning of the string
        searchStr = searchStr.replace(/^\s\s*|^[\n\r]/g, '');
        if (regexStart.test(searchStr) && searchStr.length) {
            searchStr = searchStr.replace(pattern, '');
            return searchStr.indexOf(' ') < 0 && !/[\r\n]/.test(searchStr)
                ? searchStr.replace(delimiter, '')
                : false;
        }
        return false;
    }

    /**
     * Detects if mentioned partners are still in the composer text input
     * and removes them if not.
     *
     * @private
     */
    _validatePartnerIds() {
        const inputMentions = this.getContent().match(new RegExp("@"+'[^ ]+(?= |&nbsp;|$)', 'g'));
        if (inputMentions) {
            for (const id in this._mentions) {
                const mention = this._mentions[id];
                let inputMention = inputMentions.find(function(item) {
                    return item === ("@" + mention.name).replace(/ /g, '\u00a0');
                });
                if (!inputMention) {
                    this._mentions.splice(this._mentions.indexOf(mention), 1);
                }
            }
        }
        else {
            this._mentions = [];
        }
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param ev
     */
    _onClickMentionItem(ev) {
        ev.preventDefault();
        if (ev.target.className.includes('o_mention')) {
            let target = ev.target.attributes['data-id'];
            if (!target) {
                target = ev.target.offsetParent.attributes['data-id'];
            }
            const index = target.value;
            const selection = this.state.mentionSuggestions[0].find(function(item) {
                return item.id === parseInt(index);
            });
            this._insertMentionSuggestion(selection);
            this.focus();
        }
    }

    /**
     * @private
     */
    _onInputTextarea() {
        this._updateHeight();
        this.trigger('o-input-composer-text-input');
    }

    /**
     * @private
     * @param {KeyboardEvent} ev
     */
    _onKeydownTextarea(ev) {
        switch (ev.key) {
            // UP, DOWN, TAB: prevent moving cursor if navigation in mention propositions
            case 'ArrowUp':
            case 'ArrowDown':
            case 'Tab':
                if (this.state.isMentionsOpen) {
                    ev.preventDefault();
                }
                break;
            // ENTER: submit the message only if the dropdown mention proposition is not displayed
            case 'Enter':
                if (this.state.isMentionsOpen) {
                    ev.preventDefault();
                } else {
                    this._onKeydownTextareaEnter(ev);
                }
                break;
        }
    }

    /**
     * @private
     * @param ev
     */
    _onKeyupTextarea(ev) {
        let active = undefined;
        let selectionIndex = undefined;
        if (this.state.isMentionsOpen) {
            const active_id = this.state.active_id;
            active = this.state.mentionSuggestions[0].find(function (item) {
                return item.id === active_id;
            });
            selectionIndex = this.state.mentionSuggestions[0].indexOf(active);
        }
        switch (ev.key) {
            // ESCAPE: close mention propositions
            case 'Escape':
                if (this.state.isMentionsOpen) {
                    this.state.isMentionsOpen = false;
                    this.state.mentionSuggestions = [];
                    this.state.active_id = 0;
                    ev.stopPropagation();
                } else {
                    this._onKeyupTextareaEscape(ev);
                }
                break;
            // ENTER, HOME, END, UP, DOWN, PAGE UP, PAGE DOWN, TAB: check if navigation in mention propositions
            case 'Enter':
                if (this.state.isMentionsOpen) {
                    this._insertMentionSuggestion(active);
                }
                break;
            case 'ArrowUp':
            case 'PageUp':
                if (this.state.isMentionsOpen) {
                    if (selectionIndex !== 0) {
                        active = this.state.mentionSuggestions[0][selectionIndex - 1];
                    } else {
                        active = this.state.mentionSuggestions[0][this.state.mentionSuggestions[0].length - 1];
                    }
                    this.state.active_id = active.id;
                }
                break;
            case 'ArrowDown':
            case 'PageDown':
                if (this.state.isMentionsOpen) {
                    if (selectionIndex !== this.state.mentionSuggestions[0].length - 1) {
                        active = this.state.mentionSuggestions[0][selectionIndex + 1];
                    } else {
                        active = this.state.mentionSuggestions[0][0];
                    }
                    this.state.active_id = active.id;
                }
                break;
            case 'Home':
                if (this.state.isMentionsOpen) {
                    active = this.state.mentionSuggestions[0][0];
                    this.state.active_id = active.id;
                }
                break;
            case 'End':
                if (this.state.isMentionsOpen) {
                    active = this.state.mentionSuggestions[0][this.state.mentionSuggestions[0].length - 1];
                    this.state.active_id = active.id;
                }
                break;
            case 'Tab':
                if (this.state.isMentionsOpen) {
                    if (ev.shiftKey) {
                        if (selectionIndex === 0) {
                            active = this.state.mentionSuggestions[0][this.state.mentionSuggestions[0].length - 1];
                        }
                        else {
                            active = this.state.mentionSuggestions[0][selectionIndex - 1];
                        }
                    } else {
                        if (selectionIndex === this.state.mentionSuggestions[0].length - 1) {
                            active = this.state.mentionSuggestions[0][0];
                        }
                        else {
                            active = this.state.mentionSuggestions[0][selectionIndex + 1];
                        }
                    }
                    this.state.active_id = active.id;
                }
                break;
            // Otherwise, check if a mention is typed
            default:
                this._detectDelimiter();
        }
    }

    /**
     * @private
     * @param {KeyboardEvent} ev
     */
    _onKeydownTextareaEnter(ev) {
        if (!this.props.hasSendOnEnterEnabled) {
            return;
        }
        if (ev.shiftKey) {
            return;
        }
        if (this.storeProps.isMobile) {
            return;
        }
        this.trigger('o-keydown-enter');
        ev.preventDefault();
    }

    /**
     * @private
     * @param {KeyboardEvent} ev
     */
    _onKeyupTextareaEscape(ev) {
        if (!this._isEmpty()) {
            return;
        }
        this.trigger('o-discard');
        ev.preventDefault();
    }

    /**
     * @private
     * @param ev
     */
    _onMouseOverMention(ev) {
        if (ev.target.className.includes('o_mention_proposition')) {
            const new_active_id = ev.target.attributes['data-id'].value;
            this.state.active_id = parseInt(new_active_id);
        }
    }
}

ComposerTextInput.defaultProps = {
    hasSendOnEnterEnabled: true,
    mentionsLowPosition: false,
};

ComposerTextInput.props = {
    composerLocalId: String,
    hasSendOnEnterEnabled: Boolean,
    mentionsLowPosition: Boolean,
};

ComposerTextInput.template = 'mail.component.ComposerTextInput';

return ComposerTextInput;

});
