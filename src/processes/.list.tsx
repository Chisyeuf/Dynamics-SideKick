
import { ProcessButton } from '../utils/global/.processClass';
import { StorageConfiguration } from '../utils/types/StorageConfiguration';
import impersonation from './impersonation/main';
import createConfiguration from './setConfiguration/main';
import updateRecord from './updateRecord/main';
import webResourceEditor from './webResourceEditor/main';
import allFields from './allFields/main';
import relatedRecords from './relatedRecords/main';
import commandDebugger from './commandDebugger/main';
import dirtyFields from './dirtyFields/main';
import navigation from './navigation/main';
import pluginTraceLogsExplorer from './pluginTraceLogsExplorer/main';
import optionSetTable from './optionSetTable/main';
import entitiesList from './entitiesList/main';
import metadataBrowser from './metadataBrowser/main';
import formToolsV2 from './formToolsv2/main';
import ExtensionTarget from '../utils/types/ExtensionTarget';

const TARGET = process.env.REACT_APP_TARGET;

const Processes: ProcessButton[] = [
    formToolsV2,
    updateRecord,
    allFields,
    optionSetTable,
    dirtyFields,
    relatedRecords,
    entitiesList,
    impersonation,
    // ...(TARGET === ExtensionTarget.Chrome ? [webResourceEditor] : []),
    webResourceEditor,
    pluginTraceLogsExplorer,
    metadataBrowser,
    navigation,
    commandDebugger,
    createConfiguration,
];

export const defaultProcessesList: StorageConfiguration[] = Processes.map(p => {
    return {
        id: p.id,
        startOnLoad: false,
        hidden: false,
        expand: false,
        options: null,
    }
});


export default Processes;


//* Workflow Activities Explorer
//! related records: errors during retreiving (Account - OneToMany)
//! metadata: actions menu don't close on clickaway
//! dirty: oldValue issue on complex email fields
//? formtool: label not displayed in sub form (lookup control)