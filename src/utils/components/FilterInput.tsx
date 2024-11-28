import { FormControl, IconButton, InputAdornment, TextField } from "@mui/material"
import { ChangeEvent, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ClearIcon from '@mui/icons-material/Clear';
import React from "react";
import { useDebounceValue } from "usehooks-ts";
import { useDebounce } from "@custom-react-hooks/all";

type AttributeFilterInputProps = {
    returnFilterInput: (str: string) => void,
    placeholder?: string,
    fullWidth?: boolean,
    defaultValue?: string,
    debounceDelay?: number
}
export type AttributeFilterInputRef = {
    select(): void;
    focus(): void;
}

const FilterInput = React.forwardRef<AttributeFilterInputRef, AttributeFilterInputProps>(
    (props: AttributeFilterInputProps, ref) => {
        const [value, setValue] = useState(props.defaultValue ?? '');
        const [debounceValue, setDebounceValue] = useDebounceValue(value, props.debounceDelay ?? 250);

        const inputRef = useRef<HTMLInputElement>(null);

        useImperativeHandle(ref, () => ({
            select: () => {
                inputRef.current?.select();
            },
            focus: () => {
                inputRef.current?.focus();
            },
        }));

        const handleChange = useCallback((value: string) => {
            setValue(value);
            setDebounceValue(value);
        }, [setValue, setDebounceValue]);

        useEffect(() => {
            props.returnFilterInput(debounceValue);
        }, [debounceValue]);

        return (
            <FormControl size='small' fullWidth={props.fullWidth}>
                <TextField
                    inputRef={inputRef}
                    size='small'
                    inputMode='search'
                    value={value}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        handleChange(e?.target.value ?? "")
                    }}
                    placeholder={props.placeholder}
                    fullWidth={props.fullWidth}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <FilterAltIcon />
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <IconButton
                                sx={{ visibility: value ? "visible" : "hidden" }}
                                onClick={() => {
                                    handleChange("")
                                }}
                            >
                                <ClearIcon />
                            </IconButton>
                        )
                    }}

                />
            </FormControl>
        )
    }
);

export default FilterInput