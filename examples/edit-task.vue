<template>
  <div class="vsr-dialog-wrap" v-if="isEditShow">
    <meg-dialog :visible="isEditShow" :width="'640px'" title="编辑任务" @close="closeClick">
      <div v-loading="loading" class="show-detail">
        <div class="plan-left">
          <div class="vsr-dialog-content">
            <div class="wrap input-width">
              <span class="label">任务名称</span>
              <meg-input v-model="taskname"></meg-input>
            </div>
            <div class="wrap">
              <span class="label">解析类型</span>
              <div class="con">
                {{ analysisTypeArr[analysisType] && analysisTypeArr[analysisType].label }}
              </div>
            </div>
            <div class="wrap input-width">
              <span class="label">解析倍速</span>
              <meg-input v-model="detailData.speed"></meg-input>
            </div>
            <div class="wrap">
              <span class="label">优先级</span>
              <meg-radio-group v-model="detailData.priority">
                <meg-radio :label="1">
                  一般任务
                </meg-radio>
                <meg-radio :label="0">
                  紧急任务
                </meg-radio>
              </meg-radio-group>
            </div>
            <div class="wrap">
              <span class="label">自动比对</span>
              <div class="con">
                是否
                {{detailData.autoCompare}}
              </div>
            </div>
            <div class="wrap last-item">
              <span class="label">比对目标</span>
              <div class="con">
                <span>{{ '布控库' }}</span>
                <meg-input :value="albumsText" type="textarea" readonly :rows="6"></meg-input>
              </div>
            </div>
          </div>
        </div>
      </div>
      <span slot="footer" class="dialog-footer">
        <meg-button type="primary" :loading="btnLoading" :disabled="loading" @click="saveEdit">{{ '保存' }}</meg-button>
        <meg-button @click.native="closeClick">{{ '取消' }}</meg-button>
      </span>
    </meg-dialog>
  </div>
</template>
<script>
import commonMapList from '@/utils/data-map.utils';
import videoService from './videotape-analysis/videotape-analysis.service';

const test='人脸库'
export default {
  props: {
    monitorInfo: {
      type: Object,
      default: () => ({})
    },
    // 显示详情的弹框
    isEditShow: {
      type: Boolean,
      default: false
    },
    detailData: {
      type: Object,
      default: () => {}
    }
  },

  data() {
    return {
      changed: false,
      loading: true,
      btnLoading: false,
      taskname: '',
      analysisTypeArr: commonMapList.analysisTypeArr[2]
    };
  },

  computed: {
    albumsText() {
      const albums = {
        compareFaceSets: test,
        compareBodySets: '人体库',
        compareMotorSets: '机动车库',
        compareNonMotorSets: '非机动车库',
        compareNonMotorLicenseSets: '非机动车车牌库',
        compareMotorLicenseSets: '机动车车牌库'
      };
      const mapText = Object.keys(albums).map(key => {
        let text = '';
        const data = this.detailData[key] || [];

        if (data.length) {
          const val = data.map(item => {
            const name = item.albumName || item.name;
            const thres = item.threshold ? `, this.$t('阈值'):${item.threshold}` : '';
            const str = name ? `${name + thres};` : '';
            return str;
          }).join('');

          if (val) {
            text = null;
          }
        }

        return text;
      });
      return mapText.filter(item => item.length).join('\n');
    },

    analysisType() {
      let tempIndex = 0;
      this.analysisTypeArr.forEach((item, index) => {
        const curItem = item.val;
        const arr = Object.keys(curItem).every(key => curItem[key] === this.detailData[key]);

        if (arr) {
          tempIndex = index;
        }
      });
      return tempIndex;
    }

  },
  watch: {
    detailData(data) {
      this.taskname = data.taskName || '';
      this.loading = !(data && Object.keys(data).length);
    }

  },
  methods: {
    async checkName(taskName) {
      const {
        code,
        data
      } = await videoService.checkName({
        taskName
      });

      if (code === 0 && data) {
        this.$message.error({
          message: this.$t('任务名称重复'),
          showClose: true
        });
        return true;
      }

      return false;
    },

    checkValue(speed) {
      const {
        monitorInfo
      } = this;

      if (!/^\d+$/.test(speed)) {
        return false;
      }

      if (speed > monitorInfo.totalVideoPower || speed < 0) {
        return false;
      }

      return true;
    },

    async saveEdit() {
      if (this.btnLoading) return false;
      const {
        speed,
        taskName
      } = this.detailData;

      if (!taskName) {
        return this.$message.error({
          message: this.$t('请填写任务名称'),
          showClose: true
        });
      }

      if (taskName !== this.taskname) {
        const checked = await this.checkName(this.taskname);

        if (checked) {
          return false;
        }
      }

      if (speed === '') {
        return this.$message.error({
          message: this.$t('请填写解析倍速'),
          showClose: true
        });
      }

      if (speed <= 0) {
        return this.$message.error({
          message: this.$t('请输入大于0的解析倍速'),
          showClose: true
        });
      }

      if (!this.checkValue(speed)) {
        const {
          totalVideoPower
        } = this.monitorInfo;
        return this.$message.error({
          message: this.$t('请输入0-{totalVideoPower}的解析倍速', {
            totalVideoPower
          }),
          showClose: true
        });
      }

      this.btnLoading = true;
      this.$emit('save-edit', { ...this.detailData,
        ...{
          taskName: this.taskname
        }
      });
      return false;
    },

    /**
     * 取消编辑
     */
    closeClick() {
      this.$emit('close-click');
    }

  }
};
</script>
<style lang='scss' scoped>
  .meg-dialog__body{
    padding-bottom: 20px;
  }
  .vsr-dialog-content {
    .wrap {
      display: flex;
      align-items: baseline;
      line-height: 34px;
      margin-bottom: 10px;

      .label {
        width: 60px;
        text-align: right;
        color: #869ABB;
        margin-right: 12px;
      }

      .con {
        flex: 1;
        color: #435068;
      }
    }
    .meg-input,.meg-radio-group {
      flex: 1;
      ::v-deep input {
        width: 270px;
      }
    }
    .last-item {
      margin-bottom: 25px;
    }
  }
</style>