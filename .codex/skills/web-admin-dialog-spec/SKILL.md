# Web Admin 弹窗交互规范（项目级 Skill）

## 适用范围
- 项目：`web-admin`（Vue 3 + Element Plus）
- 场景：所有新增/编辑/删除/上传/导入/设置保存等会触发后端写入的弹窗
- 目标：统一交互，避免误关闭、重复提交、状态不同步和误操作

## 先读现状（本项目既有约定）
- 现有弹窗组件：`DeleteConfirmDialog.vue`、`BindingDialog.vue`、`RenewalDialog.vue`，以及各页面内联 `el-dialog`
- 现有常用属性：
  - `:show-close="false"`
  - `:close-on-click-modal="false"`
  - `:close-on-press-escape="!submitting"`（仅提交中禁 ESC，非提交中可 ESC）
  - `:disabled="submitting"` / `:loading="submitting"` / `{{ submitting ? "确认中" : "确认文案" }}`
- 现有提交通道：`submitWithFeedback`（`src/utils/databaseAction.js`）

## 标准实现模板（Element Plus）
```vue
<el-dialog
  v-model="visible"
  :show-close="false"
  :close-on-click-modal="false"
  :close-on-press-escape="!submitting"
  :before-close="handleBeforeClose"
>
  <el-form ref="formRef" :model="form" :rules="rules" :disabled="submitting">
    <!-- 表单项 -->
  </el-form>

  <template #footer>
    <el-button :disabled="submitting" @click="handleCancel">取消</el-button>
    <el-button
      :type="danger ? 'danger' : 'primary'"
      :loading="submitting"
      :disabled="submitting"
      @click="handleConfirm"
    >
      {{ submitting ? "确认中" : "确认" }}
    </el-button>
  </template>
</el-dialog>
```

## 必须遵守
1. 右上角关闭按钮关闭：`show-close=false`
2. 不能点遮罩关闭：`close-on-click-modal=false`
3. ESC 行为：仅提交中禁止关闭，非提交中允许（项目确认）
4. 底部仅保留“取消/确认”
5. 危险操作确认按钮用 `type="danger"`
6. 提交中必须全锁定：
   - 表单禁用
   - 取消按钮禁用
   - 确认按钮禁用 + loading + 文案“确认中”
7. 提交中禁止任何关闭路径（含 `before-close`、`v-model` 回写）

## 确认按钮流程（写库前后）
1. 先做前端校验（`formRef.validate()` 或等价校验）
2. 校验失败：
   - 不调接口
   - 展示表单错误
   - 不进入 submitting
3. 校验成功：
   - `submitting=true`
   - 锁定弹窗内所有控件
   - 调用后端写入接口
4. 接口失败：
   - 显示可理解失败通知（不透出堆栈/SQL/路径）
   - 弹窗保持打开
   - `submitting=false` 并解锁
5. 接口成功：
   - 显示成功通知
   - 刷新列表/详情数据
   - 关闭弹窗并重置表单
   - `submitting=false`

## validate 统一要求（已确认执行）
- 所有写库弹窗必须接入前端校验。
- 必填项、格式项、范围项在前端先拦截；未通过校验不得发起接口请求。
- 页面内未使用 `el-form rules` 的旧弹窗，后续改造时必须补齐。

## submitWithFeedback 统一要求（已确认执行）
- `submitWithFeedback` 是“统一提交流程函数”，不仅是错误提示。
- 统一负责：提交中状态切换、成功通知、失败通知、结束解锁。
- 失败提示使用用户可理解文案，不直接暴露后端内部错误细节。

## 通知文案规范
- 成功：`保存成功` / `上传成功` / `删除成功` / `导入成功` / `设置已更新`
- 失败：`保存失败，请稍后重试` / `删除失败，请稍后重试` / `操作失败，请联系管理员`
- 禁止直接向用户暴露后端错误细节

## 与当前项目对齐的样式要求（管理端）
- 浅色后台风格：白色弹窗、圆角、柔和阴影
- 默认确认按钮 `primary`，危险操作 `danger`
- 底部操作区右对齐

## 自检清单（每次改弹窗后）
1. 无右上角关闭按钮
2. 底部仅“取消/确认”
3. 遮罩不可关闭
4. ESC 在提交中不可关闭，非提交中可关闭
5. 点击确认后进入 loading 且文案“确认中”
6. 提交中不可重复提交、不可取消
7. 失败后有失败通知且解锁
8. 成功后有成功通知、关闭弹窗、刷新数据
9. 校验失败不调用接口

## 已确认结论
1. ESC：仅提交中禁止，平时允许
2. validate：必须做，且校验失败不得请求后端
3. submitWithFeedback：需要统一，作为提交状态与通知的公共入口

## 落地顺序建议
1. 先统一 `submitWithFeedback` 的错误消息策略
2. 再分页面补齐 `validate`（客户、账户、参数、绑定、续费等）
3. 最后逐个弹窗自检并收敛交互细节
