import { FormControl, IconButton, InputAdornment, TextField } from "@mui/material"
import { useEffect, useImperativeHandle, useRef, useState } from "react"
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ClearIcon from '@mui/icons-material/Clear';
import React from "react";
import { useDebounce } from "usehooks-ts";

type AttributeFilterInputProps = {
    returnFilterInput: (str: string) => void,
    placeholder?: string,
    fullWidth?: boolean,
    forcedValue?: string,
}
export type AttributeFilterInputRef = {
    focus(): void;
}

const FilterInput = React.forwardRef<AttributeFilterInputRef, AttributeFilterInputProps>(
    (props: AttributeFilterInputProps, ref) => {
        const [value, setValue] = useState(props.forcedValue ?? '');
        const debounceValue = useDebounce(value, 250);

        const inputRef = useRef<HTMLInputElement>(null);

        useImperativeHandle(ref, () => ({
            focus: () => {
                // logic to focus the rendered component from 3rd party belongs here
                inputRef.current?.focus();
            },
        }));

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
                    onChange={(e) => {
                        setValue(e?.target.value ?? "")
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
                                    setValue("")
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