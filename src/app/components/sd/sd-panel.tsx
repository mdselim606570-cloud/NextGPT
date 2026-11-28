import styles from "./sd-panel.module.scss";
import React from "react";
import { Select } from "@/components/ui/ui-lib";
import { IconButton } from "@/components/ui/button";
import Locale from "@/i18n/locales";
import { useSdStore } from "@/features/image-generation/store/sd";
import clsx from "clsx";
import {
  models,
  getModelParamBasicData,
  getParams,
} from "@/app/utils/sd-model";

export { params, models, getModelParamBasicData, getParams } from "@/app/utils/sd-model";

export function ControlParamItem(props: {
  title: string;
  subTitle?: string;
  required?: boolean;
  children?: JSX.Element | JSX.Element[];
  className?: string;
}) {
  return (
    <div className={clsx(styles["ctrl-param-item"], props.className)}>
      <div className={styles["ctrl-param-item-header"]}>
        <div className={styles["ctrl-param-item-title"]}>
          <div>
            {props.title}
            {props.required && <span style={{ color: "red" }}>*</span>}
          </div>
        </div>
      </div>
      {props.children}
      {props.subTitle && (
        <div className={styles["ctrl-param-item-sub-title"]}>
          {props.subTitle}
        </div>
      )}
    </div>
  );
}

export function ControlParam(props: {
  columns: any[];
  data: any;
  onChange: (field: string, val: any) => void;
}) {
  return (
    <>
      {props.columns?.map((item) => {
        let element: null | JSX.Element;
        switch (item.type) {
          case "textarea":
            element = (
              <ControlParamItem
                title={item.name}
                subTitle={item.sub}
                required={item.required}
              >
                <textarea
                  rows={item.rows || 3}
                  style={{ maxWidth: "100%", width: "100%", padding: "10px" }}
                  placeholder={item.placeholder}
                  onChange={(e) => {
                    props.onChange(item.value, e.currentTarget.value);
                  }}
                  value={props.data[item.value]}
                ></textarea>
              </ControlParamItem>
            );
            break;
          case "select":
            element = (
              <ControlParamItem
                title={item.name}
                subTitle={item.sub}
                required={item.required}
              >
                <Select
                  aria-label={item.name}
                  value={props.data[item.value]}
                  onChange={(e) => {
                    props.onChange(item.value, e.currentTarget.value);
                  }}
                >
                  {item.options.map((opt: any) => {
                    return (
                      <option value={opt.value} key={opt.value}>
                        {opt.name}
                      </option>
                    );
                  })}
                </Select>
              </ControlParamItem>
            );
            break;
          case "number":
            element = (
              <ControlParamItem
                title={item.name}
                subTitle={item.sub}
                required={item.required}
              >
                <input
                  aria-label={item.name}
                  type="number"
                  min={item.min}
                  max={item.max}
                  value={props.data[item.value] || 0}
                  onChange={(e) => {
                    props.onChange(item.value, parseInt(e.currentTarget.value));
                  }}
                />
              </ControlParamItem>
            );
            break;
          default:
            element = (
              <ControlParamItem
                title={item.name}
                subTitle={item.sub}
                required={item.required}
              >
                <input
                  aria-label={item.name}
                  type="text"
                  value={props.data[item.value]}
                  style={{ maxWidth: "100%", width: "100%" }}
                  onChange={(e) => {
                    props.onChange(item.value, e.currentTarget.value);
                  }}
                />
              </ControlParamItem>
            );
        }
        return <div key={item.value}>{element}</div>;
      })}
    </>
  );
}

export function SdPanel() {
  const sdStore = useSdStore();
  const currentModel = sdStore.currentModel;
  const setCurrentModel = sdStore.setCurrentModel;
  const params = sdStore.currentParams;
  const setParams = sdStore.setCurrentParams;

  const handleValueChange = (field: string, val: any) => {
    setParams({
      ...params,
      [field]: val,
    });
  };
  const handleModelChange = (model: any) => {
    setCurrentModel(model);
    setParams(getModelParamBasicData(model.params({}), params));
  };

  return (
    <>
      <ControlParamItem title={Locale.SdPanel.AIModel}>
        <div className={styles["ai-models"]}>
          {models.map((item) => {
            return (
              <IconButton
                text={item.name}
                key={item.value}
                type={currentModel.value == item.value ? "primary" : null}
                shadow
                onClick={() => handleModelChange(item)}
              />
            );
          })}
        </div>
      </ControlParamItem>
      <ControlParam
        columns={getParams?.(currentModel, params) as any[]}
        data={params}
        onChange={handleValueChange}
      ></ControlParam>
    </>
  );
}
