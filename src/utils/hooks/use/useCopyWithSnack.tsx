import { useSnackbar } from "notistack";
import { useCallback } from "react";
import { useCopyToClipboard } from "usehooks-ts";

const TEXT_MAX_LENGHT = 125;

interface useCopyWithSnackOptions {
    callback?: () => void
    textPrefix?: string
}
function useCopyWithSnack(options: useCopyWithSnackOptions = {}) {
    const { callback, textPrefix = 'Value' } = options;

    const { enqueueSnackbar } = useSnackbar();
    const [, copytoClipboard] = useCopyToClipboard();

    const copy = useCallback((text: string) => {
        if (text) {
            copytoClipboard(text);
            if (text.length > TEXT_MAX_LENGHT) {
                text = `${text?.slice(0, TEXT_MAX_LENGHT - 3)}...`;
            }
            enqueueSnackbar(`${textPrefix} "${text}" copied.`, { variant: 'default' });
        }
        else {
            enqueueSnackbar("Undefined text to copy!", { variant: 'error' });
        }
        callback?.();
    }, [callback, copytoClipboard, enqueueSnackbar, textPrefix]);

    return copy;
}

export default useCopyWithSnack;