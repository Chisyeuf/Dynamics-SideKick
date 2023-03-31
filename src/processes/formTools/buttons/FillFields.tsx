import { Tooltip, Button } from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { SubProcessProps } from '../main';

import FormatPaintIcon from '@mui/icons-material/FormatPaint';
import { RetrieveAttributesMetaData } from '../../../utils/hooks/XrmApi/RetrieveAttributesMetaData';
import { AttributeMetadata, MSDateFormat, MSType } from '../../../utils/types/requestsType';
import { LookupValue } from '../../../utils/types/LookupValue';

enum FillFieldsSteps {
    Mandatory,
    All,
    Empty,
    Original,
}
function FillFields(props: SubProcessProps) {

    const { currentFormContext } = props;

    const [step, setStep] = useState<FillFieldsSteps | null>(null);

    const [attributeMetadata, isFetching] = RetrieveAttributesMetaData(currentFormContext?.data.entity.getEntityName() ?? '');

    const toggleFieldsValues = () => {
        setStep((prev) => {
            console.log("toggleFieldsValues", prev);
            if (prev === null) {
                return FillFieldsSteps.Mandatory;
            }
            if (prev >= (Object.keys(FillFieldsSteps).length / 2) - 1) {
                return 0;
            }
            return prev + 1;
        });
    }

    const getRandomValue = async (attribute: Xrm.Attributes.Attribute, metadata: AttributeMetadata) => {

        switch (metadata.MStype) {
            case MSType.Lookup:
                return getRandomLookup(metadata.Parameters.Target);
            case MSType.String:
            case MSType.Memo:
                return getRandomString(metadata.Parameters.MaxLength);
            case MSType.Decimal:
            case MSType.Double:
            case MSType.Money:
            case MSType.Integer:
            case MSType.BigInt:
                return getRandomNumber(metadata.Parameters.MinValue, metadata.Parameters.MaxValue, metadata.Parameters.Precision);
            case MSType.DateTime:
                return getRandomDate(metadata.Parameters.Format);
            case MSType.Boolean:
            case MSType.Status:
            case MSType.State:
            case MSType.Picklist:
            case MSType.MultiSelectPicklist:
                if (!currentFormContext) return null;
                const options = Object.values(
                    (await Xrm.Utility.getEntityMetadata(
                        currentFormContext.data.entity.getEntityName(),
                        [attribute.getName()])).Attributes.get(0).OptionSet
                ).map((o: any) => o.value);
                return getRandomPickList(options);
            case MSType.Uniqueidentifier:
            case MSType.Null:
                return null;
        }
    }

    const title: React.ReactNode = useMemo(() => {
        const decriptions: string[] = [
            "Fill Mandatory fields",
            "Fill All fields",
            "Clear all fields values",
            "Original fields values",
        ];
        return (
            <div>
                <span>Steps:</span><br />
                {
                    decriptions.map((d, i) => {
                        if (step === i) {
                            return (<>{'🠆 '}<b>{d}</b><br /></>);
                        }
                        return (<>{'  '}<i>{d}</i><br /></>);
                    })
                }
            </div>
        )
    }, [step]);

    const attributes = useMemo(() => {
        if (currentFormContext) {
            const controls: Xrm.Attributes.Attribute[] = currentFormContext.getAttribute();

            return controls;
        }
        else {
            return null;
        }
    }, [currentFormContext]);

    const originalValues = useMemo(() => {
        if (!attributes) return null;

        return attributes.map((attribute) => {
            const name = attribute.getName();
            const value = attribute.getValue();
            return { name, value };
        })
    }, [attributes])


    useEffect(() => {
        if (!attributes || !currentFormContext || step == null) return;

        const functions = [
            (attribute: Xrm.Attributes.Attribute) => {
                console.log("mandatory fields");
                const metadata = attributeMetadata.find(meta => meta.LogicalName === attribute.getName());
                if (!metadata) return;
                if (!metadata.IsValidForUpdate) return;

                if (attribute.getRequiredLevel() === 'required' && !attribute.getValue()) {
                    getRandomValue(attribute, metadata).then((randomValue) => {
                        attribute.setValue(randomValue);
                    });
                }
            },
            (attribute: Xrm.Attributes.Attribute) => {
                console.log("all fields");
                const metadata = attributeMetadata.find(meta => meta.LogicalName === attribute.getName());
                if (!metadata) return;
                if (!metadata.IsValidForUpdate) return;

                if (!attribute.getValue()) {
                    getRandomValue(attribute, metadata).then((randomValue) => {
                        if (randomValue !== undefined)
                            attribute.setValue(randomValue);
                    });
                }
            },
            (attribute: Xrm.Attributes.Attribute) => {
                console.log("clear fields");
                const metadata = attributeMetadata.find(meta => meta.LogicalName === attribute.getName());
                if (!metadata) return;
                if (!metadata.IsValidForUpdate) return;

                if (attribute.getValue()) {
                    attribute.setValue(null);
                }
            },
            (attribute: Xrm.Attributes.Attribute) => {
                console.log("original fields");
                const metadata = attributeMetadata.find(meta => meta.LogicalName === attribute.getName());
                if (!metadata) return;
                if (!metadata.IsValidForUpdate) return;

                const originalValue = originalValues?.find((v) => v.name === attribute.getName());
                attribute.setValue(originalValue?.value);
            },
        ]

        attributes.forEach(functions[step]);

    }, [attributes, step, originalValues]);



    return (
        <Tooltip title={title} placement='left'>
            <Button
                variant='contained'
                onClick={toggleFieldsValues}
                startIcon={<FormatPaintIcon />}
            />
        </Tooltip>
    );
}

function getRandomNumber(minValue: number, maxValue: number, precision: number = 0) {
    const number = minValue + Math.random() * (maxValue - minValue);
    return Number(number.toFixed(precision));
}

function getRandomString(maxLength: number) {
    const length = getRandomNumber(2, maxLength);

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;

    let result = '';
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

function getRandomPickList(options: number[]) {
    const randomIndex = getRandomNumber(0, options.length);
    return options.at(randomIndex);
}

async function getRandomLookup(target: string): Promise<LookupValue[] | null> {
    const primaryIdAttribute = (await Xrm.Utility.getEntityMetadata(target)).PrimaryIdAttribute;
    const primaryNameAttribute = (await Xrm.Utility.getEntityMetadata(target)).PrimaryNameAttribute;
    const record = (await Xrm.WebApi.online.retrieveMultipleRecords(target, `?$select=${primaryIdAttribute},${primaryNameAttribute}`, 1)).entities.at(0);
    if (!record) return null;
    return [{
        id: record[primaryIdAttribute],
        name: record[primaryNameAttribute],
        entityType: target,
    }];
}

function getRandomDate(format: MSDateFormat) {
    const start = new Date(1753, 1, 1);
    const end = new Date(9999, 12, 31);
    return new Date(getRandomNumber(start.getTime(), end.getTime()));
}

export default FillFields;