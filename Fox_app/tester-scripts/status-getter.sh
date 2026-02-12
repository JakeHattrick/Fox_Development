#!/bin/bash

PATH=/usr/local/sbin:usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/cuda/bin:/root/bin		#cron does not have the full PATH when calling the script, need to redefine it here
cd /mnt/nv/server_logs/rohanjh/status-getter-test-run/

LOGPATH="/mnt/nv/mods/test/logs"		#regular path
STATUS=									#start as blank
CFGPATH="/mnt/nv/mods/test/cfg"
SAVEDLOGPATH="/mnt/nv/logs"


#SCREENFILE="/mnt/nv/autotest-output_$(date +"%Y%m%d_%H%M%S").txt"	#if monitoring output with screen

if [[ -n $(pgrep autotest.sh) ]]; then
	STATUS="TESTING"

	if [[ -e $LOGPATH/log.txt ]]; then
	STATION=$(find $LOGPATH -name FXNC* | awk -F _ '{ print $6 }' | tail -n 1)
	#	read -r STATION STARTTIME < <(tail -n 5 $LOGPATH/log.txt | grep "start time" | awk '{ print $3" "$7"-"$8 }')
		# grep -A 3 "bioscheck - end time"
	else
		STATUS="TESTING-waiting for scan"
	fi
else
	STATUS="IDLE"
	MOSTRECENTLOG=$(ls -t $SAVEDLOGPATH/*.log | head -n 2)
	if [[ $MOSTRECENTLOG =~ "PASS" ]];then
		STATUS="IDLE-pass"
	elif [[ $MOSTRECENTLOG =~ "FAIL" ]];then
		STATUS="IDLE-fail"
	fi
fi

#gather information about fixture, cards, etc. give each one a variable
FIXTURENAME=$(hostname)
GENTYPE=$(dmidecode -s system-product-name | sed -e 's/PW-TOM-B-ATX-G5/Gen 5 B tester/' -e 's/TOM-B-ATX/Gen 3 B tester/')
FIXTURESN=$(dmidecode -s system-serial-number)			#serial number of tester
IPADDR=$(ip addr show up | grep "inet.*brd" | sed 's/.*brd//' | awk '{ print $1 }')
#MACADDR=$(ifconfig | grep ether | awk '{print $2}')    



if [[ $GENTYPE =~ "Gen 5 B tester" ]]; then
	LEFTPORT=$(lspci | grep 17)
	RIGHTPORT=$(lspci | grep 9b)
elif [[ $GENTYPE =~ "Gen 3 B tester" ]]; then
	LEFTPORT=$(lspci | grep 65)
	RIGHTPORT=$(lspci | grep b3)
fi

if [[ -z $RIGHTPORT && -z $LEFTPORT ]];then	#both slots empty
	STATUS="empty"
elif [[ -n $RIGHTPORT && -n $LEFTPORT ]];then	#both slots occupied
	RIGHTSN=$(grep serial_number2 $CFGPATH/uutself.cfg.env | sed 's/serial_number2=//')
	RIGHTPN=$(grep part_number $CFGPATH/$RIGHTSN.RSP | sed 's/part_number=//')
	# RIGHT699=$(grep 699PN $CFGPATH/$RIGHTSN.RSP | sed 's/699PN=//')
	LEFTSN=$(grep serial_number= $CFGPATH/uutself.cfg.env | sed 's/serial_number=//')
	LEFTPN=$(grep part_number $CFGPATH/$LEFTSN.RSP | sed 's/part_number=//')
	# LEFT699=$(grep 699PN $CFGPATH/$LEFTSN.RSP | sed 's/699PN=//')
	# RIGHTSN=
	# LEFTSN=
elif [[ -n $RIGHTPORT ]];then					#only right slot occupied
	RIGHTSN=$(find $LOGPATH/ -maxdepth 1 -name FXNC* | awk -F _ '{ print $4 }')
	# echo right
	# RIGHTSN=$(grep serial_number= $CFGPATH/uutself.cfg.ini | sed 's/serial_number=//')
	# RIGHTPN=$(grep part_number $CFGPATH/$RIGHTSN.RSP | sed 's/part_number=//')
	# RIGHT699=$(grep 699PN $CFGPATH/$RIGHTSN.RSP | sed 's/699PN=//')
	# RIGHTSN=$(grep "SN=" $LOGPATH/log.txt | sed 's/.*SN=//')	
elif [[ -n $LEFTPORT ]];then	#only left slot occupied
	# echo left
	LEFTSN=$(find $LOGPATH/ -maxdepth 1 -name FXNC* | awk -F _ '{ print $4 }')
	#LEFTSN=$(grep serial_number= $CFGPATH/uutself.cfg.ini | sed 's/serial_number=//')
	#LEFTPN=$(grep part_number $CFGPATH/$LEFTSN.RSP | sed 's/part_number=//')
	#LEFT699=$(grep 699PN $CFGPATH/$LEFTSN.RSP | sed 's/699PN=//')
	# LEFTSN=$(grep "SN=" $LOGPATH/log.txt | sed 's/.*SN=//')
fi


OUTPUTFILENAME="$(hostname)_$(date +"%Y%m%d_%H%M%S").json"
echo -n "{
  \"fixture_name\": \"$FIXTURENAME\",
  \"gen_type\": \"$GENTYPE\",
  \"fixture_sn\": \"$FIXTURESN\",
  \"test_type\": \"$STATUS\",
  \"test_station\": \"$STATION\",
  \"ip_address\": \"$IPADDR\",
  \"mac_address\": \"$MACADDR\",
  \"creator\": \"$CREATOR\",
  
  \"left-PN\": \"$LEFTPN\",
\"left-SN\": \"$LEFTSN\",
\"left-logpath\": \"$LEFTLOG\",

  \"right-PN\": \"$RIGHTPN\",
\"right-SN\": \"$RIGHTSN\",
\"right-logpath\": \"$RIGHTLOG\"
  
}" > $OUTPUTFILENAME


# cp blank-tester-to-server-format.json $OUTPUTFILENAME
# sed -i "s/fixture_name.*/fixture_name\":\"$FIXTURENAME\",/" $OUTPUTFILENAME
# sed -i "s/gen_type.*/gen_type\":\"$GENTYPE\",/" $OUTPUTFILENAME
# sed -i "s/fixture_sn.*/fixture_sn\":\"$FIXTURESN\",/" $OUTPUTFILENAME
# sed -i "s/test_type.*/test_type\":\"$STATUS\",/" $OUTPUTFILENAME
# sed -i "s/test_station.*/test_station\":\"$STATION\",/" $OUTPUTFILENAME
# sed -i "s/ip_address.*/ip_address\":\"$IPADDR\",/" $OUTPUTFILENAME
# sed -i "s/mac_address.*/mac_address\":\"$MACADDR\",/" $OUTPUTFILENAME
# sed -i "s/creator.*/creator\":\"$CREATOR\",/" $OUTPUTFILENAME

# sed -i "s/left-PN.*/left-PN\":\"$LEFTPN\",/" $OUTPUTFILENAME
# sed -i "s/left-SN.*/left-SN\":\"$LEFTSN\",/" $OUTPUTFILENAME
# sed -i "s/left-logpath.*/left-logpath\":\"$LEFTLOG\",/" $OUTPUTFILENAME

# sed -i "s/right-PN.*/right-PN\":\"$RIGHTPN\",/" $OUTPUTFILENAME
# sed -i "s/right-SN.*/right-SN\":\"$RIGHTSN\",/" $OUTPUTFILENAME
# sed -i "s/right-logpath.*/right-logpath\":\"$RIGHTLOG\"/" $OUTPUTFILENAME