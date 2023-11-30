import { Button, Dialog, DialogContent, Divider, FormControlLabel, IconButton, List, ListItem, ListItemButton, ListItemText, ListSubheader, Slide, Stack, Switch } from '@mui/material';
import React, { forwardRef, useCallback, useEffect, useRef, useState, } from 'react';
import { ProcessProps, ProcessButton, ProcessRef } from '../../utils/global/.processClass';
import { useDictionnary } from '../../utils/hooks/use/useDictionnary';
import { ScriptNodeContent } from '../../utils/types/ScriptNodeContent';
import { CodeEditorCommon, CodeEditorDirectory, CodeEditorFile, CodeEditorForwardRef } from '../../utils/components/CodeEditorComponent/utils/types';
import CodeEditor from '../../utils/components/CodeEditorComponent/CodeEditor';
import { buildFileTree, getAllFiles, getFiles } from '../../utils/components/CodeEditorComponent/utils/fileManagement';
import { TransitionProps } from '@mui/material/transitions';
import RestoreIcon from '@mui/icons-material/Restore';
import { GetExtensionId, debugLog } from '../../utils/global/common';
import { MessageType } from '../../utils/types/Message';
import { useXrmUpdated } from '../../utils/hooks/use/useXrmUpdated';
import { ScriptOverride } from '../../utils/types/ScriptOverride';
import CodeIcon from '@mui/icons-material/Code';
import { SvgIconComponent } from '@mui/icons-material';


const separationOfUrlAndFileName = 'webresources/';

class WebRessourceEditor extends ProcessButton {
    constructor() {
        super(
            'webressourceeditor',
            'WebRessources Editor',
            <CodeIcon />,
            300
        );
        this.process = WebRessourceEditorProcess;
    }

}

const WebRessourceEditorProcess = forwardRef<ProcessRef, ProcessProps>(
    function WebRessourceEditorProcess(props: ProcessProps, ref) {

        const xrmUpdated = useXrmUpdated();

        const [scriptNodeContent, setScriptNodeContent] = useState<ScriptNodeContent[] | null>(null);
        const { dict: scriptsOverrided, keys: scriptsOverridedId, values: scriptsContent, setDict: setScriptsOverride, setValue: setScriptOverrideItem, removeValue: removeScriptOverrideItem } = useDictionnary<string>({})
        const [root, setRoot] = useState<CodeEditorDirectory | undefined>();
        const [open, setOpen] = useState(false);
        const [liveTestEnabled, setLiveTestEnabled] = useState<boolean>(false);

        const [liveTestEnabledInitDone, setLiveTestEnabledInitDone] = useState<boolean>(false);
        const [scriptOverrideIntiDone, setScriptOverrideIntiDone] = useState<boolean>(false);

        useEffect(() => {
            const extensionId = GetExtensionId();
            chrome.runtime.sendMessage(extensionId, { type: MessageType.GETCURRENTREQUESTINTERCEPTION },
                function (response: ScriptOverride | null) {
                    if (response) {
                        setScriptsOverride(response);
                    }
                    setScriptOverrideIntiDone(true);
                }
            );
            chrome.runtime.sendMessage(extensionId, { type: MessageType.ISDEBUGGERATTACHED },
                function (response: boolean) {
                    setLiveTestEnabled(response);
                    setTimeout(() => {
                        setLiveTestEnabledInitDone(true);
                    }, 500);
                }
            );
        }, []);


        useEffect(() => {
            // document.querySelectorAll('[id^="ClientApiFrame"]:not([id*="crm_header_global"]):not([id*="id"])');
            setScriptNodeContent(null);
            const docs = document.querySelectorAll<HTMLIFrameElement>('[id^="ClientApiFrame"]:not([id*="crm_header_global"]):not([id*="id"])');
            Promise.all(Array.from(docs).flatMap(doc => {
                if (doc.contentWindow)
                    return Array.prototype.slice
                        .apply(doc.contentWindow.document.querySelectorAll('script'))
                        .filter((s: HTMLScriptElement, index, array) => s.src.startsWith(Xrm.Utility.getGlobalContext().getClientUrl()))
                        .map<Promise<ScriptNodeContent>>(async (s: HTMLScriptElement) => {
                            const fileName = s.src.substring(s.src.search(separationOfUrlAndFileName) + separationOfUrlAndFileName.length);
                            return {
                                src: s.src,
                                content: await fetch(s.src).then(r => r.text()),
                                crmId: (await Xrm.WebApi.retrieveMultipleRecords("webresource", `?$select=webresourceid&$filter=(name eq '${fileName}')`).then(
                                    function success(results) {
                                        return results.entities[0]["webresourceid"] as string;
                                    },
                                    function (error) {
                                        console.error(`Error when attempt of retrieve webresource id with : ${error.message}`);
                                    }
                                ))
                            } as ScriptNodeContent;
                        });
            })).then((scriptNodeContents) => {
                if (!scriptNodeContents) return;
                const scriptNodeContentsDistinctNotNull: ScriptNodeContent[] = scriptNodeContents.filter((i, index, array) => i && array.findIndex(a => a?.src === i.src) === index) as any;
                debugLog("Scripts found:", scriptNodeContentsDistinctNotNull);
                setScriptNodeContent(scriptNodeContentsDistinctNotNull);
            });
        }, [xrmUpdated]);

        useEffect(() => {
            if (!scriptNodeContent) return;
            const root = buildFileTree(scriptNodeContent);
            setRoot(root);
        }, [scriptNodeContent]);


        const handleOnSave = useCallback(
            (fileSaved: CodeEditorFile, rootCopy: CodeEditorDirectory) => {
                setRoot(rootCopy);
                if (scriptNodeContent?.find(s => s.src === fileSaved.crmId)?.content === fileSaved.modifiedContent) {
                    removeScriptOverrideItem(fileSaved.crmId);
                    return;
                }
                if (scriptsOverrided[fileSaved.crmId] !== fileSaved.modifiedContent) {
                    setScriptOverrideItem(fileSaved.crmId, fileSaved.modifiedContent);
                    return;
                }
            },
            [scriptsOverrided, scriptNodeContent, setScriptOverrideItem, removeScriptOverrideItem, setRoot]
        );
        const handleOnChange = useCallback((fileUnsaved: CodeEditorFile, rootCopy: CodeEditorDirectory) => {
            setRoot(rootCopy);
        }, [setRoot]);
        const handleOnRootUpdate = useCallback((newElement: CodeEditorCommon, rootCopy: CodeEditorDirectory) => {
            setRoot(rootCopy);
        }, [setRoot]);

        const publishChanges = useCallback(() => {
            // alert("PUBLISH!!!");
            if (scriptsOverridedId.length === 0) return;

            scriptsOverridedId.forEach(scriptid => {
                var record = {
                    content: scriptsOverrided[scriptid]
                };

                Xrm.WebApi.updateRecord("webresource", scriptid, record).then(
                    function success(result) {
                        var updatedId = result.id;
                        debugLog(`Webresource ${updatedId} content updated`);
                    },
                    function (error) {
                        console.error(`Error when attempt to update the webResource ${scriptid}: ${error.message}`);
                    }
                );
            });

            var execute_PublishXml_Request = {
                ParameterXml: `<importexportxml><webresources>${scriptsOverridedId.map(scriptid => `<webresource>${scriptid}</webresource>`).join('')}</webresources></importexportxml>`,
                getMetadata: function () {
                    return {
                        boundParameter: null,
                        parameterTypes: {
                            ParameterXml: { typeName: "Edm.String", structuralProperty: 1 }
                        },
                        operationType: 0, operationName: "PublishXml"
                    };
                }
            };

            Xrm.WebApi.online.execute(execute_PublishXml_Request).then(
                function success(response) {
                    if (response.ok) { console.log("Publish Done"); }
                }
            ).catch(function (error) {
                console.error(`Error when attempt to publish webressources ${error.message}`);
            });
        }, [scriptsOverridedId, scriptsOverrided]);


        useEffect(() => {
            console.log(scriptsOverrided);
        }, [scriptsOverrided]);

        useEffect(() => {
            if (!liveTestEnabledInitDone) return;
            if (!scriptOverrideIntiDone) return;

            const extensionId = GetExtensionId();

            if (liveTestEnabled && scriptNodeContent) {
                const scriptOverridedToSendToBack: { [key: string]: string } = {};
                scriptsOverridedId.forEach((scriptid) => {
                    const url = scriptNodeContent.find(s => s.crmId === scriptid)?.src;
                    url && (scriptOverridedToSendToBack[url] = scriptsOverrided[scriptid]);
                });
                console.log("scriptsOverride sent", scriptsOverrided);
                chrome.runtime.sendMessage(extensionId, { type: MessageType.ENABLEREQUESTINTERCEPTION, data: scriptOverridedToSendToBack },
                    function (response) {
                        debugLog("WebRessourceEditorProcess ", MessageType.ENABLEREQUESTINTERCEPTION, response);
                        if (response.success) {
                        }
                    }
                );
            }
            else {
                console.log("scriptsOverride disabled");
                chrome.runtime.sendMessage(extensionId, { type: MessageType.DISABLEREQUESTINTERCEPTION },
                    function (response) {
                        debugLog("WebRessourceEditorProcess ", MessageType.DISABLEREQUESTINTERCEPTION, response);
                        if (response.success) {
                        }
                    }
                );
            }
        }, [liveTestEnabled, scriptsOverrided, scriptsOverridedId]);


        const codeEditorRef = useRef<CodeEditorForwardRef>(null);

        const selectFile = useCallback((selectedFile: CodeEditorFile) => {
            codeEditorRef.current?.selectFile(selectedFile);
            setOpen(true);
        }, [codeEditorRef]);

        const removeScriptOverride = useCallback((selectedFile: CodeEditorFile) => {
            removeScriptOverrideItem(selectedFile.crmId);
        }, [removeScriptOverrideItem]);


        return (
            <>
                <Stack spacing={1} width='calc(100% - 10px)' padding='10px' alignItems='center'>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={liveTestEnabled}
                                onClick={() => {
                                    setLiveTestEnabled(prev => !prev);
                                }}
                            />
                        }
                        label="Live Testing Enabled"
                    />

                    <Button
                        variant='contained'
                        onClick={() => {
                            const extensionId = GetExtensionId();
                            chrome.runtime.sendMessage(extensionId, { type: MessageType.REFRESHBYPASSCACHE },
                                function (response) {
                                    if (response.success) {
                                    }
                                }
                            );
                        }}
                    >
                        Refresh without cache
                    </Button>

                    <Divider />

                    <Button
                        variant='contained'
                        onClick={publishChanges}
                    >
                        Publish Overrided Content
                    </Button>

                    <Divider />

                    <Button
                        variant='contained'
                        onClick={() => {
                            setOpen(prev => !prev);
                        }}
                    >
                        Open Editor
                    </Button>

                    <ScriptList
                        text='Scripts overrided:'
                        items={root && getFiles(root, (file => scriptsOverridedId.indexOf(file.crmId) !== -1)) || []}
                        primaryLabel={(item) => item.name}
                        primaryAction={selectFile}
                        secondaryAction={removeScriptOverride}
                        secondaryIcon={RestoreIcon}
                        secondaryTitle='Restore file'
                    />
                    <ScriptList
                        text='Scripts found on this page:'
                        items={root && getAllFiles(root) || []}
                        primaryLabel={(item) => scriptsOverrided[item.crmId] ? <strong>{item.name}</strong> : item.name}
                        primaryAction={selectFile}
                    />
                </Stack >
                <Dialog
                    fullScreen
                    open={open}
                    maxWidth={false}
                    TransitionComponent={Transition}
                    keepMounted
                >
                    <DialogContent sx={{ padding: '0', }}>
                        {root &&
                            <CodeEditor
                                ref={codeEditorRef}
                                root={root}
                                theme='vs-dark'
                                defaultLanguage='javascript'
                                onChange={handleOnChange}
                                onSave={handleOnSave}
                                onRootUpdate={handleOnRootUpdate}
                                onClose={() => setOpen(false)}
                                publishChanges={publishChanges}
                            />
                        }
                    </DialogContent>
                </Dialog>
            </>
        );
    }
);

type ScriptListProps<T> = {
    text: string,
    items: T[],
    primaryLabel: (item: T) => React.ReactNode,
    primaryAction: (item: T) => void,
    secondaryAction?: (item: T) => void,
    secondaryIcon?: SvgIconComponent,
    secondaryTitle?: string,
}
function ScriptList<T>(props: ScriptListProps<T>) {
    return (
        <List
            sx={{ width: '100%', bgcolor: 'background.paper', overflowX: 'hidden', overflowY: 'auto' }}
            component="nav"
            disablePadding
            subheader={
                <ListSubheader component="div">
                    <strong>{props.text}</strong>
                </ListSubheader>
            }
        >
            {
                props.items?.map(item => (
                    <ListItem
                        secondaryAction={
                            props.secondaryAction && props.secondaryIcon && (
                                <IconButton edge="end" title={props.secondaryTitle} onClick={() => props.secondaryAction!(item)}>
                                    <props.secondaryIcon />
                                </IconButton>
                            )
                        }
                        disablePadding
                    >
                        <ListItemButton dense onClick={() => props.primaryAction(item)}>
                            <ListItemText
                                primary={props.primaryLabel(item)}
                                primaryTypographyProps={{
                                    fontSize: '0.85rem',
                                    lineHeight: '1',
                                }} />
                        </ListItemButton>
                    </ListItem>)
                )
            }
        </List>
    );
}

const Transition = forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});


const webRessourceEditor = new WebRessourceEditor();
export default webRessourceEditor;