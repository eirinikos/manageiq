cfmeAngularApplication.controller('scheduleFormController', ['$http', '$scope', 'storageTable', 'scheduleFormId', 'oneMonthAgo', 'miqService', 'timerOptionService', function($http, $scope, storageTable, scheduleFormId, oneMonthAgo, miqService, timerOptionService) {
  var init = function() {
    $scope.finishedLoading = false;
    cfmeAngularApplication.$scope = $scope;

    if (scheduleFormId == 'new') {
      $scope.newSchedule         = true;
      $scope.actionType          = 'vm';
      $scope.filterType          = 'all';
      $scope.scheduleEnabled     = '1';
      $scope.filterValuesEmpty   = true;
      var today                  = new Date();
      var tomorrowsDate          = parseInt(today.getDate()) + 1;
      $scope.miq_angular_date_1  = today.getMonth() + 1 + "/" + tomorrowsDate + "/" + today.getFullYear();
      $scope.scheduleTimerType   = 'Once';
      $scope.scheduleTimeZone    = 'UTC';
      $scope.scheduleStartHour   = '0';
      $scope.scheduleStartMinute = '0';
      $scope.finishedLoading     = true;
    } else {
      $scope.newSchedule = false;

      miqService.sparkleOn();

      $http.get('/ops/schedule_form_fields/' + scheduleFormId).success(function(data) {
        $scope.actionType          = data.action_type;
        $scope.depotName           = data.depot_name;
        $scope.filterType          = data.filter_type;
        $scope.logUserid           = data.log_userid;
        $scope.logPassword         = data.log_password;
        $scope.logVerify           = data.log_verify;
        $scope.logProtocol         = data.protocol;
        $scope.scheduleDescription = data.schedule_description;
        $scope.scheduleEnabled     = data.schedule_enabled;
        $scope.scheduleName        = data.schedule_name;
        $scope.scheduleTimerType   = data.schedule_timer_type;
        $scope.scheduleTimerValue  = data.schedule_timer_value;
        $scope.miq_angular_date_1  = data.schedule_start_date;
        $scope.scheduleStartHour   = data.schedule_start_hour;
        $scope.scheduleStartMinute = data.schedule_start_min;
        $scope.scheduleTimeZone    = data.schedule_time_zone;
        $scope.uri                 = data.uri;
        $scope.uriPrefix           = data.uri_prefix;

        $scope.timerItems          = timerOptionService.getOptions($scope.scheduleTimerType);

        if (data.filter_type === 'all' || (data.protocol !== undefined && data.protocol !== null)) {
          $scope.filterValuesEmpty = true;
        } else {
          buildFilterList(data);

          $scope.filterValuesEmpty = false;
          $scope.filterValue = data.filter_value;
        }

        $scope.finishedLoading = true;

        miqService.sparkleOff();
      });
    }

    miqService.buildCalendar(oneMonthAgo.year, parseInt(oneMonthAgo.month) + 1, oneMonthAgo.date);
  };

  var buildFilterList = function(data) {
    $scope.filterList = [];
    angular.forEach(data.filtered_item_list, function(filteredItem) {
      var tempObj = {};

      if (Object.prototype.toString.call(filteredItem) === '[object Array]') {
        tempObj.text = filteredItem[1];
        tempObj.value = filteredItem[0];
      } else {
        tempObj.text = filteredItem;
        tempObj.value = filteredItem;
      }

      $scope.filterList.push(tempObj);
    });
  };

  var testType = function(type) {
    return type.test($scope.actionType);
  };

  var isVmType = function() {
    return testType(/^vm/);
  };

  var isHostType = function() {
    return testType(/^host/);
  };

  var scheduleEditButtonClicked = function(buttonName, serializeFields) {
    miqService.sparkleOn();
    var url = '/ops/schedule_edit/' + scheduleFormId + '?button=' + buttonName;
    if (serializeFields === undefined) {
      miqService.miqAjaxButton(url);
    } else {
      miqService.miqAjaxButton(url, serializeFields);
    }
  };

  $scope.buildLegend = function() {
    var type;

    if (isVmType()) {
      type = 'VM';
    } else if (isHostType()) {
      type = 'Host';
    } else if ($scope.actionType === 'miq_template') {
      type = 'Template';
    } else if ($scope.actionType === 'emscluster') {
      type = 'Cluster';
    } else if ($scope.actionType === 'storage') {
      type = storageTable;
    } else if ($scope.actionType === 'db_backup') {
      type = 'Database Backup';
    }

    return type + ' Selection';
  };

  $scope.determineActionType = function() {
    if (isVmType()) {
      return 'vm';
    } else if (isHostType()) {
      return 'host';
    } else {
      return $scope.actionType;
    }
  };

  $scope.dbBackup = function() {
    return $scope.actionType === 'db_backup';
  };

  $scope.sambaBackup = function() {
    return $scope.dbBackup() && $scope.logProtocol === 'Samba';
  };

  $scope.actionTypeChanged = function() {
    if ($scope.dbBackup()) {
      $scope.logProtocol = 'Network File System';
    } else {
      $scope.filterType = 'all';
    }

    $scope.filterValuesEmpty = true;
  };

  $scope.filterTypeChanged = function() {
    if ($scope.filterType != 'all') {
      miqService.sparkleOn();
      $http.post('/ops/schedule_form_filter_type_field_changed/' + scheduleFormId, {filter_type: $scope.filterType}).success(function(data) {
        buildFilterList(data);
        $scope.filterValuesEmpty = false;
        miqService.sparkleOff();
      });
    } else {
      $scope.filterValuesEmpty = true;
    }

    $scope.filterValue = null;
  };

  $scope.logProtocolChanged = function() {
    if ($scope.logProtocol === "Samba") {
      $scope.uriPrefix = "smb";
    }

    if ($scope.logProtocol === "Network File System") {
      $scope.uriPrefix = "nfs";
    }
  };

  $scope.filterValueChanged = function() {
    if ($scope.formAltered) {
      miqService.showButtons();
    } else {
      miqService.hideButtons();
    }
  };

  $scope.scheduleTimerTypeChanged = function() {
    $scope.timerItems = timerOptionService.getOptions($scope.scheduleTimerType);

    if ($scope.timerNotOnce()) {
      $scope.scheduleTimerValue = 1;
    } else {
      $scope.scheduleTimerValue = null;
    }
  };

  $scope.timerNotOnce = function() {
    return $scope.scheduleTimerType !== 'Once';
  };

  $scope.saveable = function(scheduleForm) {
    return scheduleForm.$valid && scheduleForm.$dirty;
  };

  $scope.cancelClicked = function() {
    scheduleEditButtonClicked('cancel');
  };

  $scope.resetClicked = function() {
    scheduleEditButtonClicked('reset');
  };

  $scope.saveClicked = function() {
    scheduleEditButtonClicked('save', true);
  };

  $scope.addClicked = function() {
    scheduleEditButtonClicked('add', true);
  };

  $scope.triggerCheckChange = function(date) {
    $scope.miq_angular_date_1 = date;
    $scope.$apply(function() {
      $scope.scheduleForm.miq_angular_date_1.$setViewValue($scope.miq_angular_date_1);
    });
  };

  init();
}]);
