/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */


/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";

    // Load dependent modules
    var AppInit             = brackets.getModule("utils/AppInit"),
        CodeHintManager     = brackets.getModule("editor/CodeHintManager"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        HTMLUtils           = brackets.getModule("language/HTMLUtils"),
        HtmlSpecialChars    = require("text!SpecialChars.json"),
        specialChars;

    /**
     * @constructor
     */
    function SpecialCharHints() {
        this.primaryTriggerKeys = "&ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#0123456789";
        this.currentQuery = "";
    }
    
    /**
     * Determines whether HtmlSpecialChar hints are available in the current editor
     * context.
     * 
     * @param {Editor} editor 
     * A non-null editor object for the active window.
     *
     * @param {String} implicitChar 
     * Either null, if the hinting request was explicit, or a single character
     * that represents the last insertion and that indicates an implicit
     * hinting request.
     *
     * @return {Boolean} 
     * Determines whether the current provider is able to provide hints for
     * the given editor context and, in case implicitChar is non- null,
     * whether it is appropriate to do so.
     */
    SpecialCharHints.prototype.hasHints = function (editor, implicitChar) {
        this.editor = editor;
        
        var query = this._getQuery();

        if (implicitChar === null) {
            return query !== null;
        } else {
            return implicitChar === "&" || query !== null;
        }
    };
       
    /**
     * Returns a list of avaliable HtmlSpecialChar hints if possible for the current
     * editor context. 
     * 
     * @param {String} implicitChar 
     * Either null, if the hinting request was explicit, or a single character
     * that represents the last insertion and that indicates an implicit
     * hinting request.
     *
     * @return {Object<hints: Array<(String + jQuery.Obj)>, match: String, selectInitial: Boolean>}
     * Null if the provider wishes to end the hinting session. Otherwise, a
     * response object that provides 1. a sorted array hints that consists 
     * of strings; 2. a string match that is used by the manager to emphasize
     * matching substrings when rendering the hint list; and 3. a boolean that
     * indicates whether the first result, if one exists, should be selected
     * by default in the hint list window.
     */
    SpecialCharHints.prototype.getHints = function (implicitChar) {
        var query,
            result;

        if (this.primaryTriggerKeys.indexOf(implicitChar) !== -1 || implicitChar === null) {
            this.currentQuery = query = this._getQuery();
            result = $.map(specialChars, function (value, index) {
                if (value.indexOf(query) === 0) {
                    var shownValue = (value.indexOf("#") === -1) ? value.replace("&", "&amp;") : value.replace("#", "&#35;");
                    return shownValue + " <span class='entity-display-character'>" + value + ";</span>";
                }
            }).sort(function (a, b) {
                a = a.toLowerCase();
                b = b.toLowerCase();
                return a.localeCompare(b);
            });
            
            query = (query.indexOf("#") === -1) ? query.replace("&", "&amp;") : query.replace("#", "&#35;");
            return {
                hints: result,
                match: query,
                selectInitial: true
            };
        }
        
        return null;
    };
    
    /**
     * Returns a query for the Hints
     * 
     * @return {String} 
     * The Query for which to search
     */
    SpecialCharHints.prototype._getQuery = function () {
        var query,
            lineContent,
            startChar,
            endChar;
        
        query = "&";
                
        lineContent = this.editor.document.getRange({
            line: this.editor.getCursorPos().line,
            ch: 0
        }, this.editor.getCursorPos());
        
        startChar = lineContent.lastIndexOf("&");
        endChar = lineContent.lastIndexOf(";");
        
        if (endChar < startChar) {
            query = this.editor.document.getRange({
                line: this.editor.getCursorPos().line,
                ch: startChar
            }, this.editor.getCursorPos());
        }
        
        if (startChar !== -1 && HTMLUtils.getTagAttributes(this.editor, this.editor.getCursorPos()).length === 0) {
            return query;
        } else {
            return null;
        }
    };
    
    /**
     * Inserts a given HtmlSpecialChar hint into the current editor context. 
     * 
     * @param {String} hint 
     * The hint to be inserted into the editor context.
     * 
     * @return {Boolean} 
     * Indicates whether the manager should follow hint insertion with an
     * additional explicit hint request.
     */
    SpecialCharHints.prototype.insertHint = function (completion) {
        var start = {line: -1, ch: -1},
            end = {line: -1, ch: -1},
            cursor = this.editor.getCursorPos();

        end.line = start.line = cursor.line;
        start.ch = cursor.ch - this.currentQuery.length;
        end.ch = start.ch + this.currentQuery.length;
        completion = completion.slice(0, completion.indexOf(" ")) + ";";
        completion = completion.replace("&#35;", "#").replace("&amp;", "&");
        if (start.ch !== end.ch) {
            this.editor.document.replaceRange(completion, start, end);
        } else {
            this.editor.document.replaceRange(completion, start);
        }
        
        return false;
    };

    AppInit.appReady(function () {
        ExtensionUtils.loadStyleSheet(module, "styles.css");
        // Parse JSON files
        specialChars = JSON.parse(HtmlSpecialChars);
        
        // Register code hint providers
        var specialCharHints = new SpecialCharHints();
        
        CodeHintManager.registerHintProvider(specialCharHints, ["html"], 1);
    });
});