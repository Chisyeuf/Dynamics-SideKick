import { useContext, useEffect, useMemo, useState } from 'react';

import { Portal } from '@mui/base';
import { ControlType } from '../../../utils/types/ControlType';

import TurnedInIcon from '@mui/icons-material/TurnedIn';
import TurnedInNotIcon from '@mui/icons-material/TurnedInNot';
import { LogicalNameTypography } from '../../../utils/components/LogicalNameTypography';
import { setStyle } from '../../../utils/global/common';
import { IToolButtonControlled, ToolButton } from '../ToolButton';
import { useDictionnary } from '../../../utils/hooks/use/useDictionnary';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { FormToolContext } from '../context';


function ShowFieldLabel(props: IToolButtonControlled) {

    const { enabled: labelDisplayed, setEnabled: setLabelDisplayed, } = props;

    const { formContext, formDocument, domUpdated, xrmRoute } = useContext(FormToolContext);

    useEffect(() => {
        if (formDocument) {
            setStyle(formDocument, "fieldLabelSheet", {
                "div[fieldlogicalname]": ["width:100%", "min-width:0"]
            });
        }
    }, [formDocument]);

    const formFields = useMemo(async () => {
        if (formContext) {
            const controls: Xrm.Controls.Control[] = formContext.getControl((c) => {
                const type = c.getControlType();
                if (type.startsWith(ControlType.CUSTOMSUBGRID)) {
                    return false;
                }
                switch (type) {
                    case ControlType.IFRAME:
                    case ControlType.SUBGRID:
                    case ControlType.WEBRESSOURCE:
                    case ControlType.NOTES:
                    case ControlType.TIMER:
                    case ControlType.KBSEARCH:
                    case ControlType.TIMELINE:
                    case ControlType.QUICKFORM:
                        return false;
                    case ControlType.LOOKUP:
                    case ControlType.STANDARD:
                    case ControlType.OPTIONSET:
                    default:
                        return true;
                }
            });

            return controls;
        }
        else {
            return null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [domUpdated, formContext]);



    const grids = useMemo(async () => {
        if (formContext) {
            const grids: Xrm.Controls.GridControl[] = formContext.getControl(
                (c) => c.getControlType() === ControlType.SUBGRID || c.getControlType().startsWith(ControlType.CUSTOMSUBGRID)) as any;

            return grids;
        }
        else {
            return null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [domUpdated, formContext]);

    const { values: fieldLabelNodes, setValue: setFieldLabelNode, setDict: setFieldLabelNodeDict } = useDictionnary<HTMLDivElement>({});
    useEffect(() => {
        if (!formDocument) {
            return;
        }
        formFields.then(field => field?.forEach((c) => {
            const controlName = c.getName();
            const controlNodeLabel = formDocument.querySelector<HTMLElement>(`[data-id="${controlName}"] div:not([fieldlogicalname]) > label, [id="${controlName}"] div:not([fieldlogicalname]) > label`);
            if (controlNodeLabel) {
                const controlNodeParent = controlNodeLabel?.parentElement ?? null;
                const controlNode = formDocument.createElement('div');
                controlNode.setAttribute('fieldlogicalname', controlName);
                controlNodeLabel && controlNode.append(controlNodeLabel);
                controlNodeParent?.prepend(controlNode);
                setFieldLabelNode(controlName, controlNode);
            }
            else {
                const controlNodeLabelAlreadyProcessed = formDocument.querySelector<HTMLDivElement>(`[data-id="${controlName}"] [fieldlogicalname], [id="${controlName}"] [fieldlogicalname]`);
                if (controlNodeLabelAlreadyProcessed)
                    setFieldLabelNode(controlName, controlNodeLabelAlreadyProcessed);
            }
        }));
    }, [domUpdated, formFields, formDocument, setFieldLabelNode]);

    const { values: gridLabelNodes, setValue: setGridLabelNode, setDict: setGridLabelNodeDict } = useDictionnary<HTMLDivElement>({});
    useEffect(() => {
        if (!formDocument) {
            return;
        }
        grids.then(grid => grid?.forEach((c) => {
            const gridName: string = c.getName();
            const gridNodeParent: Element | null = formDocument.querySelector(`#dataSetRoot_${gridName} > div:first-child:not(:has(div[gridlogicalname]))`);

            if (gridNodeParent) {
                const gridNode = formDocument.createElement('div');
                gridNode.setAttribute('gridlogicalname', gridName);
                gridNodeParent?.append(gridNode);
                setGridLabelNode(gridName, gridNode);
            }
            else {
                const gridNodeAlreadyProcessed = formDocument.querySelector<HTMLDivElement>(`#dataSetRoot_${gridName} > div:first-child div[gridlogicalname]`);
                if (gridNodeAlreadyProcessed)
                    setGridLabelNode(gridName, gridNodeAlreadyProcessed);
            }
        }));
    }, [domUpdated, grids, formDocument, setGridLabelNode]);

    useEffect(() => {
        setFieldLabelNodeDict({});
        setGridLabelNodeDict({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setFieldLabelNodeDict, setGridLabelNodeDict, xrmRoute.current]);


    const fieldLabelPortal = useMemo(() => {
        if (!labelDisplayed) {
            return;
        }
        return fieldLabelNodes?.map(controlNode => {
            const controlName = controlNode.getAttribute('fieldlogicalname');
            if (!controlName) {
                return null;
            }
            return (
                <Portal container={controlNode}>
                    <LogicalNameTypography label={controlName} />
                </Portal>
            );
        });
    }, [labelDisplayed, fieldLabelNodes]);

    const gridLabelPortal = useMemo(() => {
        if (!labelDisplayed) {
            return;
        }
        return gridLabelNodes?.map(controlNode => {
            const gridName = controlNode.getAttribute('gridlogicalname');
            if (!gridName) {
                return null;
            }
            return (
                <Portal container={controlNode}>
                    <LogicalNameTypography label={gridName} />
                </Portal>
            );
        });
    }, [labelDisplayed, gridLabelNodes]);


    const cache = createCache({
        key: 'css',
        container: formDocument?.head ?? document.head,
        prepend: true
    });

    return (<>
        <ToolButton
            controlled={true}
            icon={labelDisplayed ? <TurnedInIcon /> : <TurnedInNotIcon />}
            tooltip='Show Fields & Grids Control LogicalNames'
            setEnabled={setLabelDisplayed}
        />
        <CacheProvider value={cache as any}>
            {fieldLabelPortal}
            {gridLabelPortal}
        </CacheProvider>
    </>
    );
}

export default ShowFieldLabel;