'use strict';

var chatApp = angular.module('chatApp', ]);
/*chatApp.factory('SocketData', function($resource) {
  return $resource('/project/:id', { id: '@id' });
});
console.log('factory');*/
chatApp.controller('ChatCtrl', ['$scope', '$sce', function($scope, $sce) {
    $scope.sounds = [
        "boom"
        , "hello"
        , "disconnected"
        , "connected"
    ];
    $scope.trustAudio = function(sound) {
        return $sce.trustAsResourceUrl('sounds/' + sound + '.mp3');
    }
}]);
console.log('control');
//{"nudge": "boom", "notify": "hello", "disconnected": "disconnected", "connected": "connected"};
/*chatApp.directive('setAudio', function(){
    return {
        restrict: "A"
        , scope: {
            setAudio:'@setAudio',
        }
        , link: function(scope, element){
            console.log(scope.setAudio, element[0], arguments);
        }
    };
});*/