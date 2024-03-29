<template>
  <div class="docker-container">
    <transition name="fade-in">
    <div v-if="perspective == '2d'" :class="gridClass">
      <DockerService v-for="(s, index) in dockerServices" 
        :key="s.name" 
        :gridIndex = "index+1" 
        :serviceName="s.name" 
        :state="s.status" 
        :uptime="s.uptime"
        @controlEvent="controlContainer"
        ref="cell"
      />
    </div>
    <WhaleScene @controlEvent="controlContainer" v-else ref="whale" :services="dockerServices" />
    </transition>
    <DockerControlPanel
      @toggleView="togglePerspective()"
      @refreshContainers="loadContainerList(true)"
      @openSettings="this.$emit('openSettings')" />
    <transition name="fade-in">
      <img v-if="perspective == '2d'" class="docker-container__whale" src="images/docker-large-blank.png">
    </transition>
    <transition name="fade">
      <DockerInfoPopup v-if="showDetails" :details="containerDetails" @close="showDetails = false" />
    </transition>
  </div>
</template>

<script>
import DockerService from './DockerService.vue'
import DockerControlPanel from './DockerControlPanel.vue';
import notifications from '../notifications';

import { defineAsyncComponent } from 'vue'

export default {
  name: 'DockerContainer',
  components: {
      DockerService,
      DockerControlPanel,
      DockerInfoPopup: defineAsyncComponent(() =>
        import('@/components/DockerInfoPopup.vue')
      ),
      WhaleScene: defineAsyncComponent(() => 
        import('@/components/WhaleScene.vue'),
      ),
  },
  emits: ['openSettings'],
  props: {
    backend: String,
  },
  data() {
    return {
      dockerServices: [],
      gridClass: 'docker-container__grid',
      perspective: '2d',
      refreshHandle: null,
      showDetails: false,
      containerDetails: {}
    };
  },
  computed: {
  },
  methods: {
    showDetailedInfo(containerData) {
      this.containerDetails = containerData;
      this.showDetails = true;
    },
    loadContainerList: function(shouldNotify=false) {
        this.axios.get('/api/' + this.backend + 'List').then((res) => {
          if(res.data.Error)  throw 'BackendError'
          this.dockerServices = res.data;
      }).then(() => { 
        this.setGridSize();
        if (shouldNotify)   notifications.notifySuccess('Successfully refreshed container list');
      }).catch(e => {
        notifications.notifyWarning('Warning: Could not retrieve ' + this.backend + ' container information');
      });
    },
    authenticate: function() {
        this.axios.get('/api/' + this.backend + 'Auth').then((res) => {
          //console.log('INFO :: ' + this.backend + ' API authentication returned ' + res.data);
      }).catch(e => {
        notifications.notifyWarning('Warning: Failed to authenticate with ' + this.backend);
      });
    },
    controlContainer: function(name, operation){
        let postData = {name: name, operation: operation};

        if(operation == 'info'){   
            notifications.notifyInfo('Fetching detailed information for container ' + name + '...')
            let postData = {name: name, operation: 'info'}
            this.axios.post('/api/' + this.backend + 'Control',  postData).then((res) => {
              this.showDetailedInfo(res.data);
              return;
            }).catch(e => { 
              notifications.notifyError('Error: could not retrieve information for container ' + name) 
          });
        }
        else {
          notifications.notifyInfo('Attempting to ' + operation + ' container ' + name + '...');
          this.axios.post('/api/' + this.backend + 'Control', postData).then((res) => {
              if(res.data != 'success') throw 'controlException';
              notifications.notifySuccess('Successfully ' + operation + ((operation == 'pause' || operation == 'unpause') ? 'd' : 'ed') + ' container ' + name + '!');
              this.loadContainerList();
          }).catch(e => { 
              console.warn('Error: could not ' + operation + ' container ' + name + '. Is the selected ' + this.backend + ' backend up and reachable?'); 
          });
        }
    },
    togglePerspective() {
      if(this.perspective == '2d')  this.perspective = '3d';

      else{
        this.$refs.whale.cleanup();
        this.perspective = '2d';

        //wait 25ms to ensure 2D services are present before grid size calc
        this.refreshHandle = setInterval(() => { this.setGridSize();
          clearInterval(this.refreshHandle); }, 25)
      }
    },
    // 3-row, 8-row, etc based on highest cell
    setGridSize(){
      if(!this.$refs.cell) return this.gridClass;
      let highRow = 0;
      this.$refs.cell.forEach(c => {
        if(c.getYIndex() > highRow) highRow = c.getYIndex();
      });
      this.gridClass = 'docker-container__grid docker-container__grid__' + highRow + '-row';
    }
  },
  mounted: function() {
    this.loadContainerList();
    
    window.setInterval(() => {
      this.loadContainerList()
    }, 30 * 1000)   // Refresh container info every 30 seconds
  },
}
</script>
