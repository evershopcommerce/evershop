/**
 * @license Copyright (c) 2003-2020, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see https://ckeditor.com/legal/ckeditor-oss-license
 */

CKEDITOR.editorConfig = function (config) {
	config.toolbarGroups = [
		{ name: 'editing', groups: ['find', 'selection', 'editing', 'spellchecker'] },
		{ name: 'clipboard', groups: ['undo', 'clipboard'] },
		{ name: 'document', groups: ['mode', 'document', 'doctools'] },
		{ name: 'basicstyles', groups: ['basicstyles', 'cleanup'] },
		{ name: 'links', groups: ['links'] },
		{ name: 'insert', groups: ['insert'] },
		{ name: 'tools', groups: ['tools'] },
		{ name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align', 'bidi', 'paragraph'] },
		{ name: 'styles', groups: ['styles'] },
		{ name: 'forms', groups: ['forms'] },
		{ name: 'colors', groups: ['colors'] },
		{ name: 'about', groups: ['about'] },
		'/',
		'/',
		{ name: 'others', groups: ['others'] }
	];
	config.extraPlugins = 'nodejscartimages';
	config.allowedContent = true;

	config.protectedSource.push(/<i class[\s\S]*?\>/g);
	config.protectedSource.push(/<\/i>/g);

	config.removeDialogTabs = 'image:advanced';
	config.removeButtons = 'TextField,Textarea,Select,Button,ImageButton,HiddenField,Cut,Copy,Paste,PasteText,PasteFromWord,Save,NewPage,Preview,Print,Replace,SelectAll,Scayt,Find,Flash,Iframe,PageBreak,Language,Form,Templates,Checkbox,Radio,CopyFormatting,RemoveFormat,CreateDiv,Anchor,About,TextColor,BGColor,ShowBlocks,Image,HorizontalRule';
};